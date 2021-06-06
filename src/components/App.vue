<template>

    <div :id="`${$store.state.appName}-medigi-viewer`" ref="app" class="medigi-viewer medigi-viewer-dark-mode">
        <div :class="[
                'medigi-viewer-settings',
                { 'medigi-viewer-hidden': !$store.state.settingsOpen },
            ]"
            @click="handleModalClick"
        >
            <viewer-settings :scope="scope"></viewer-settings>
        </div>
        <div :class="[
                'medigi-viewer-interface-dropdown',
                { 'medigi-viewer-interface-dropdown-open' : menuOpen },
                { 'medigi-viewer-sidebar-closed': !sidebarOpen },
            ]"
            @mouseleave="toggleMenu(false)"
        >
            <div v-if="activeVisit"
                class="medigi-viewer-oneliner"
                @click="toggleMenu()"
            >
                {{ getVisitTitle() }}
            </div>
            <div v-else
                class="medigi-viewer-oneliner"
                @click="toggleMenu()"
            >
                {{ t('No visit selected') }}
            </div>
            <font-awesome-icon
                :icon="sidebarOpen ? ['fas', 'chevron-square-left'] : ['fas', 'chevron-square-right']"
                :title="sidebarOpen ? t('Close sidebar') : t('Open sidebar')"
                @click="toggleSidebar"
            />
            <ul>
                <li v-for="(visit, idx) in visits" :key="`${$store.state.appName}-visit-option-${idx}`">
                    <div class="medigi-viewer-visit-title medigi-viewer-oneliner">
                        {{ getVisitTitle(idx) }}
                        <div v-if="visit.date" class="medigi-viewer-visit-date medigi-viewer-oneliner">
                            {{ getLocalDatetime(visit.date) }}
                        </div>
                    </div>
                    <div v-if="visit.studies.eeg.length"
                        class="medigi-viewer-visit-studies medigi-viewer-oneliner"
                        @click="selectActiveResource(visit, 'eeg')"
                    >
                        {{
                            visit.studies.eeg.length === 1 ? t('1 EEG study') :
                            t('{n} EEG studies', { n: visit.studies.eeg.length })
                        }}
                    </div>
                    <div v-if="visit.studies.ekg.length"
                        class="medigi-viewer-visit-studies medigi-viewer-oneliner"
                        @click="selectActiveResource(visit, 'ekg')"
                    >
                        {{
                            visit.studies.ekg.length === 1 ? t('1 EKG study') :
                            t('{n} EKG studies', { n: visit.studies.ekg.length })
                        }}
                    </div>
                    <div v-if="visit.studies.radiology.length"
                        class="medigi-viewer-visit-studies medigi-viewer-oneliner"
                         @click="selectActiveResource(visit, 'radiology')"
                    >
                        {{
                            visit.studies.radiology.length === 1 ? t('1 radiology study') :
                            t('{n} radiology studies', { n: visit.studies.radiology.length })
                        }}
                    </div>
                </li>
            </ul>
        </div>
        <div class="medigi-viewer-settings-button">
            <toolbar-button
                id="settings"
                :enabled="true"
                :icon="['fal', 'cog']"
                :overlay="null"
                :tooltip="t('Settings')"
                @button-clicked="toggleSettingsMenu()"
            />
        </div>
        <div :class="[
                'medigi-viewer-settings-menu',
                { 'medigi-viewer-hidden' : !settingsMenuOpen }
            ]"
        >
            <div v-if="fullscreen !== null" class="medigi-viewer-settings-menu-row" @click="toggleFullscreen()">
                <font-awesome-icon :icon="['far', fullscreen ? 'compress' : 'expand']" />
                {{ t('Fullscreen') }}
            </div>
            <div class="medigi-viewer-settings-menu-row" @click="toggleSettings()">
                <font-awesome-icon :icon="['far', 'cog']" />
                {{ t('Settings') }}
            </div>
        </div>
        <dicom-image-interface v-if="scope==='radiology'"
            ref="dicom-image-interface"
            :resources="activeVisit ? activeVisit.studies.radiology : []"
            :sidebarOpen="sidebarOpen"
            v-on:update-item-order="updateDicomImageOrder"
        />
        <ekg-interface v-else-if="scope==='ekg'"
            ref="dicom-waveform-interface"
            :resources="activeVisit ? activeVisit.studies.ekg : []"
            :sidebarOpen="sidebarOpen"
        />
        <eeg-interface v-else-if="scope==='eeg'"
            ref="eeg-interface"
            :resources="activeVisit ? activeVisit.studies.eeg : []"
            :sidebarOpen="sidebarOpen"
        />
    </div>

</template>

<script lang="ts">

import Vue from 'vue'
import { FileSystemItem, PatientVisit } from '../types/common'
import GenericVisitLoader from '../assets/loaders/GenericVisitLoader'
import LocalFileLoader from '../assets/loaders/LocalFileLoader'

export default Vue.extend({
    components: {
        DicomImageInterface: () => import(/* webpackChunkName: "radiology" */'./Radiology/Dicom/DicomImageInterface.vue'),
        EegInterface: () => import(/* webpackChunkName: "eeg" */'./EEG/EegInterface.vue'),
        EkgInterface: () => import(/* webpackChunkName: "ekg" */'./EKG/EkgInterface.vue'),
        ViewerSettings: () => import('./ViewerSettings.vue'),
        ToolbarButton: () => import('./ToolbarButton.vue'),
    },
    data () {
        return {
            fullscreen: false as boolean | null,
            menuOpen: false,
            scope: this.$store.state.SETTINGS.scopePriority[0] || 'radiology',
            selectedVisit: null as PatientVisit|null,
            settingsMenuOpen: false,
            sidebarOpen: true,
            visits: [] as PatientVisit[],
            // Theme change trigger
            themeChange: 0,
        }
    },
    watch: {
        fullscreen: function (val, old) {
            if (val === null) {
                return
            } else if (val) {
                (this.$refs['app'] as HTMLDivElement).requestFullscreen()
            } else {
                document.exitFullscreen()
            }
        },
        scope: function (val, old) {
            if (old === 'radiology' || val === 'radiology') {
                this.toggleColorTheme()
            }
        },
    },
    computed: {
        activeVisit (): PatientVisit | null {
            return this.selectedVisit
        },
    },
    methods: {
        /** Shorthand for component-specific translations */
        t: function (str: string, args?: any) {
            if (args) {
                return this.$t(`components.App.${str}`, args)
            } else {
                return (this.$t('components.App') as any)[str]
            }
        },
        getLocalDatetime: function (datetimeStr: string): string {
            if (datetimeStr.length !== 12) {
                return datetimeStr
            }
            const y = datetimeStr.substring(0, 4)
            const m = datetimeStr.substring(4, 6)
            const d = datetimeStr.substring(6, 8)
            const hr = datetimeStr.substring(8, 10)
            const min = datetimeStr.substring(10)
            return this.$t(
                'datetime',
                { y: y, m: m.replace(/^0/, ''), d: d.replace(/^0/, ''), h: hr, min: min }
            ).toString()
        },
        getVisitTitle: function (idx?: number): string {
            // Return the actual visit title, or a numbered generic title if no actual title is set
            let visit
            if (idx === undefined && this.activeVisit) {
                idx = this.visits.indexOf(this.activeVisit)
            } else if (idx === undefined || idx >= this.visits.length) {
                return ''
            }
            if (!this.visits[idx].title || this.visits[idx].title === '/') {
                return `Visit #${(idx as number) + 1}`
            }
            return this.visits[idx].title
        },
        handleFileDrag: function (event: DragEvent) {
            // Prevent default event effects
            event.stopPropagation()
            event.preventDefault()
            if (event.dataTransfer) {
                // Show that dropping the file "copies" it
                event.dataTransfer.dropEffect = 'copy'
            }
        },
        /**
         * Handle a file or directory dropped in the dropzone
         * @param event
         */
        handleFileDrop: async function (event: DragEvent) {
            // Generic file drop, check each resource type?
            const fileLoader = new LocalFileLoader()
            this.$store.state.loadingStudies = true
            fileLoader.readFilesFromSource(event).then((fileTree) => {
                if (fileTree) {
                    this.loadStudiesFromFsItem(fileTree)
                } else {
                    this.$store.state.loadingStudies = false
                }
            }).catch((error) => {
                this.$store.state.loadingStudies = false
                // TODO: Implement errors in the file loader
            })
        },
        handleModalClick: function (ev: any) {
            // Close the settings modal if the underlying (semi-transparent) background was clicked
            if (ev.target === document.querySelector('div.medigi-viewer-settings')) {
                this.$store.commit('toggle-settings', false)
            }
        },
        /**
         * Load studies from a given FilesystemItem.
         * @param fsItem FilesystemItem to load
         * @param config External visit configuration
         */
        loadStudiesFromFsItem: async function (fsItem: FileSystemItem, config?: any) {
            if (!this.$store.state.loadingStudies) {
                this.$store.state.loadingStudies = true
            }
            const visitLoader = new GenericVisitLoader()
            visitLoader.loadFromFsItem(fsItem, config).then(async visits => {
                this.visits.push(...visits)
                for (const visit of visits) {
                    // Check that the visit has a proper title
                    if (!this.selectedVisit) {
                        this.selectedVisit = visit
                        // Open the study with the highest priority
                        let bestScope = ''
                        const scopePrio = this.$store.state.SETTINGS.scopePriority
                        for (const scope in visit.studies) {
                            if (scopePrio.indexOf(scope) !== -1 &&
                                visit.studies[scope as keyof typeof visit.studies].length &&
                                (bestScope === '' || scopePrio.indexOf(scope) < scopePrio.indexOf(bestScope))
                            ) {
                                bestScope = scope
                            }
                        }
                        if (bestScope !== '') {
                            this.scope = bestScope
                        }
                    }
                }
                this.$store.state.loadingStudies = false
            }).catch((error) => {
                console.error(error)
                this.$store.state.loadingStudies = false
            })
            console.log(this.visits)
        },
        selectActiveResource(visit: PatientVisit, scope: string) {
            if (visit !== this.selectedVisit) {
                this.selectedVisit = visit
            }
            if (scope !== this.scope) {
                this.scope = scope
            }
            if (this.$refs['dicom-image-interface']) {
                (this.$refs['dicom-image-interface'] as any).updateElements()
            }
            if (this.$refs['dicom-waveform-interface']) {
                (this.$refs['dicom-waveform-interface'] as any).updateElements()
            }
            if (this.$refs['dicom-eeg-interface']) {
                (this.$refs['dicom-eeg-interface'] as any).updateElements()
            }
        },
        toggleColorTheme: function (light?: boolean) {
            const appEl = document.getElementById(`${this.$store.state.appName}-medigi-viewer`)
            if (appEl) {
                appEl.classList.add('medigi-viewer-theme-change')
                this.$nextTick(() => {
                    if (light === undefined) {
                        if (appEl.classList.contains('medigi-viewer-dark-mode')) {
                            appEl.classList.remove('medigi-viewer-dark-mode')
                            appEl.classList.add('medigi-viewer-light-mode')
                        } else {
                            appEl.classList.remove('medigi-viewer-light-mode')
                            appEl.classList.add('medigi-viewer-dark-mode')
                        }
                    } else if (light) {
                        appEl.classList.remove('medigi-viewer-dark-mode')
                        appEl.classList.add('medigi-viewer-light-mode')
                    } else {
                        appEl.classList.remove('medigi-viewer-light-mode')
                        appEl.classList.add('medigi-viewer-dark-mode')
                    }
                })
                if (this.themeChange) {
                    window.clearTimeout(this.themeChange)
                }
                // Two reasons for the timeout:
                // 1. Don't want the transition outside of color theme change
                // 2. It forces Chromium browsers to update the color of text and icons
                //    (which sometimes takes AGES, for some reason)
                this.themeChange = window.setTimeout(() => {
                    appEl.classList.remove('medigi-viewer-theme-change')
                }, 2100)
            }
        },
        toggleFullscreen: function () {
            if (this.fullscreen === null) {
                return
            }
            this.fullscreen = !this.fullscreen
        },
        toggleMenu: function (value?: boolean) {
            if (value !== undefined) {
                this.menuOpen = value
            } else {
                this.menuOpen = !this.menuOpen
            }
        },
        toggleSettings: function () {
            this.$store.commit('toggle-settings')
            if (this.$store.state.settingsOpen && this.settingsMenuOpen) {
                this.settingsMenuOpen = false
            }
        },
        toggleSettingsMenu: function () {
            if (this.$store.state.settingsOpen) {
                this.$store.commit('toggle-settings', false)
            } else {
                this.settingsMenuOpen = !this.settingsMenuOpen
            }
        },
        toggleSidebar: function () {
            this.sidebarOpen = !this.sidebarOpen
        },
        updateDicomImageOrder: function(order: string[]) {
            if (!this.activeVisit || order.length !== this.activeVisit.studies.radiology.length) {
                return
            }
            const names = []
            for (let i=0; i<order.length; i++) {
                for (let j=0; j<this.activeVisit.studies.radiology.length; j++) {
                    if (this.activeVisit.studies.radiology[j].id === order[i]) {
                        names.push(this.activeVisit.studies.radiology[j].name)
                        this.activeVisit.studies.radiology.push(
                            this.activeVisit.studies.radiology.splice(j, 1)[0] as any
                        )
                        break
                    }
                }
            }
        }
    },
    mounted () {
        // Check that fullscreen API is available
        if (!Element.prototype.requestFullscreen) {
            Element.prototype.requestFullscreen = (Element.prototype as any).mozRequestFullscreen ||
                                                  (Element.prototype as any).webkitRequestFullscreen ||
                                                  (Element.prototype as any).msRequestFullscreen
        }
        if (!document.exitFullscreen) {
            document.exitFullscreen = (document as any).webkitExitFullscreen ||
                                      (document as any).mozCancelFullScreen ||
                                      (document as any).msExitFullscreen
        }
        if (!Element.prototype.requestFullscreen || !document.exitFullscreen) {
            console.warn("Fullscreen API is not available")
            this.fullscreen = null
        }
        this.$store.commit('set-settings-value', { field: 'eeg.yPadding', value: 1.5 })
        this.$store.commit('set-settings-value', { field: 'eeg.channelSpacing', value: 1 })
        this.$store.commit('set-settings-value', { field: 'eeg.groupSpacing', value: 1.5 })
    },
})

</script>

<style>
/* Global app styles */
.medigi-viewer-theme-change, .medigi-viewer-theme-change * {
    -ms-transition: background-color 1.0s ease, border-color 1.0s ease;
    -moz-transition: background-color 1.0s ease, border-color 1.0s ease;
    -webkit-transition: background-color 1.0s ease, border-color 1.0s ease;
    transition: background-color 1.0s ease, border-color 1.0s ease;
}
.medigi-viewer-dark-mode, .medigi-viewer-dark-mode * {
    --medigi-viewer-background: #000000;
    --medigi-viewer-background-highlight: #181818;
    --medigi-viewer-background-emphasize: #303030;
    --medigi-viewer-background-modal: rgba(0, 0, 0, 0.7);
    --medigi-viewer-border: #C0C0C0;
    --medigi-viewer-border-faint: #606060;
    --medigi-viewer-border-highlight: #F0F0F0;
    --medigi-viewer-text-main: #E0E0E0;
    --medigi-viewer-text-highlight: #F0F0F0;
    --medigi-viewer-text-minor: #C0C0C0;
    --medigi-viewer-text-faint: #808080;
}
.medigi-viewer-light-mode, .medigi-viewer-light-mode * {
    --medigi-viewer-background: #FFFFFF;
    --medigi-viewer-background-highlight: #F8F8F8;
    --medigi-viewer-background-emphasize: #F0F0F0;
    --medigi-viewer-background-modal: rgba(255, 255, 255, 0.7);
    --medigi-viewer-border: #808080;
    --medigi-viewer-border-faint: #A0A0A0;
    --medigi-viewer-border-highlight: #404040;
    --medigi-viewer-text-main: #303030;
    --medigi-viewer-text-highlight: #101010;
    --medigi-viewer-text-minor: #606060;
    --medigi-viewer-text-faint: #909090;
}
/* Use prettier and more consistent scrollbars */
.medigi-viewer *::-webkit-scrollbar {
    width: 0px;
    height: 0px;
}
.medigi-viewer *::-webkit-scrollbar-thumb {
    color: var(--medigi-viewer-border-faint);
    border-radius: 5px;
}
.medigi-viewer *::-webkit-scrollbar-track-piece {
    background-color: transparent;
}
/* Main app view component styles */
.medigi-viewer {
    position: relative;
    width: 100%;
    height: 100%;
    color: var(--medigi-viewer-text-main);
    background-color: var(--medigi-viewer-background);
}
.medigi-viewer * {
    /* Don't allow selecting text by default */
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    font-family: sans-serif;
    /* Set scrollbar width for Firefox */
    scrollbar-width: none;
}
    .medigi-viewer div {
        box-sizing: border-box;
    }
    .medigi-viewer-disabled {
        opacity: 0.5;
        cursor: default;
    }
    .medigi-viewer-hidden {
        display: none !important;
    }
    .medigi-viewer-oneliner {
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }
    .medigi-viewer-settings {
        position: absolute;
        inset: 0;
        z-index: 900;
        background-color: var(--medigi-viewer-background-modal);
    }
    .medigi-viewer-interface-dropdown {
        position: absolute;
        top: 10px;
        left: 10px;
        height: 60px;
        width: 280px;
        border: solid 2px var(--medigi-viewer-border);
        border-radius: 5px;
        background-color: var(--medigi-viewer-background);
        font-size: 24px;
        line-height: 56px;
        font-size: 16px;
        cursor: pointer;
        opacity: 0.8;
        z-index: 1;
        transition: left 0.5s;
    }
        .medigi-viewer-interface-dropdown-open {
            opacity: 1.0;
            height: auto;
        }
        .medigi-viewer-interface-dropdown.medigi-viewer-sidebar-closed {
            left: -230px;
        }
        .medigi-viewer-interface-dropdown > div {
            width: 210px;
            height: 56px;
            margin: 0 10px;
            font-size: 18px;
        }
        .medigi-viewer-interface-dropdown > svg {
            position: absolute;
            right: 10px;
            top: 10px;
            font-size: 36px;
            opacity: 0.5;
        }
            .medigi-viewer-interface-dropdown > svg:hover {
                opacity: 0.75;
            }
        .medigi-viewer-interface-dropdown > ul {
            display: none;
            width: 100%;
            list-style-type: none;
            margin: 0;
            padding: 0;
            margin-block-start: 0;
            margin-block-end: 0;
            padding-inline-start: 0;
        }
            .medigi-viewer-interface-dropdown > ul > li > div {
                line-height: 30px;
                padding: 5px 10px;
            }
                .medigi-viewer-interface-dropdown > ul > li > .medigi-viewer-visit-title {
                    font-weight: bold;
                    cursor: default;
                    border-top: solid 1px var(--medigi-viewer-border-faint);
                    background-color: var(--medigi-viewer-background-emphasize);
                }
                .medigi-viewer-interface-dropdown > ul > li .medigi-viewer-visit-date {
                    height: 20px;
                    line-height: 20px;
                    font-size: 80%;
                    font-weight: normal;
                    color: var(--medigi-viewer-text-minor);
                    background-color: var(--medigi-viewer-background-emphasize);
                }
                .medigi-viewer-interface-dropdown > ul > li > .medigi-viewer-visit-studies {
                    padding-left: 15px;
                }
                .medigi-viewer-interface-dropdown > ul > li > .medigi-viewer-visit-studies:hover {
                    background-color: var(--medigi-viewer-background-highlight);
                }
        .medigi-viewer-interface-dropdown-open > ul {
            display: block;
        }
    .medigi-viewer-settings-button {
        position: absolute;
        right: 0px;
        top: 10px;
        padding-left: 10px;
        z-index: 1000; /* On top of modal */
        background-color: var(--medigi-viewer-background);
    }
    .medigi-viewer-settings-menu {
        position: absolute;
        top: 80px;
        right: 10px;
        background-color: var(--medigi-viewer-background);
        border-left: solid 1px var(--medigi-viewer-border-faint);
        border-bottom: solid 1px var(--medigi-viewer-border-faint);
        z-index: 500;
    }
        .medigi-viewer-settings-menu-row {
            height: 32px;
            line-height: 32px;
            padding: 0 10px;
            cursor: pointer;
        }
            .medigi-viewer-settings-menu-row:hover {
                background-color: var(--medigi-viewer-background-emphasize);
            }
            .medigi-viewer-settings-menu-row > svg {
                margin-right: 5px;
            }
</style>
