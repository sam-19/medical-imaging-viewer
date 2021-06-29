<template>

    <div :id="`${$store.state.appName}-medimg-viewer`" ref="app" class="medimg-viewer medimg-viewer-dark-mode">
        <div :class="[
                'medimg-viewer-settings',
                { 'medimg-viewer-hidden': !$store.state.settingsOpen },
            ]"
            @click="handleModalClick"
        >
            <viewer-settings :scope="scope"></viewer-settings>
        </div>
        <div :class="[
                'medimg-viewer-interface-dropdown',
                { 'medimg-viewer-interface-dropdown-open' : menuOpen },
                { 'medimg-viewer-sidebar-closed': !sidebarOpen },
            ]"
            @mouseleave="toggleMenu(false)"
        >
            <div v-if="activeVisit"
                class="medimg-viewer-oneliner"
                @click="toggleMenu()"
            >
                {{ getVisitTitle() }}
            </div>
            <div v-else
                class="medimg-viewer-oneliner"
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
                    <div class="medimg-viewer-visit-title medimg-viewer-oneliner">
                        {{ getVisitTitle(idx) }}
                        <div v-if="visit.date" class="medimg-viewer-visit-date medimg-viewer-oneliner">
                            {{ getLocalDatetime(visit.date) }}
                        </div>
                    </div>
                    <div v-if="visit.studies.radiology.length"
                        class="medimg-viewer-visit-studies medimg-viewer-oneliner"
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
        <div class="medimg-viewer-settings-button">
            <toolbar-button
                id="settings"
                :enabled="true"
                :icon="['fal', 'cog']"
                :overlay="null"
                tooltip="Settings"
                @button-clicked="toggleSettingsMenu()"
            />
        </div>
        <div :class="[
                'medimg-viewer-settings-menu',
                { 'medimg-viewer-hidden' : !settingsMenuOpen }
            ]"
        >
            <div v-if="fullscreen !== null" class="medimg-viewer-settings-menu-row" @click="toggleFullscreen()">
                <font-awesome-icon :icon="['far', fullscreen ? 'compress' : 'expand']" />
                {{ t('Fullscreen') }}
            </div>
            <div class="medimg-viewer-settings-menu-row" @click="toggleSettings()">
                <font-awesome-icon :icon="['far', 'cog']" />
                {{ t('Settings') }}
            </div>
        </div>
        <dicom-image-interface v-if="scope==='radiology'"
            ref="dicom-image-interface"
            :hasStudiesToLoad="studiesToLoad !== null"
            :resources="activeVisit ? activeVisit.studies.radiology : []"
            :sidebarOpen="sidebarOpen"
            v-on:load-studies="loadStudiesFromFsItem()"
            v-on:update-item-order="updateDicomImageOrder"
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
            studiesToLoad: null as null | FileSystemItem,
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
        cacheStudyFsItem: function (fsItem: FileSystemItem | null) {
            this.studiesToLoad = fsItem
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
            if (ev.target === document.querySelector('div.medimg-viewer-settings')) {
                this.$store.commit('toggle-settings', false)
            }
        },
        /**
         * Load studies from a given FilesystemItem.
         * @param fsItem FilesystemItem to load
         * @param config External visit configuration
         */
        loadStudiesFromFsItem: async function (fsItem?: FileSystemItem, config?: any) {
            this.$store.state.loadingStudies = true
            if (!fsItem) {
                // Retrieve possible cached item
                if (this.studiesToLoad) {
                    fsItem = {...this.studiesToLoad}
                    this.studiesToLoad = null
                } else {
                    return
                }
            }
            // Display loading studies indicator
            if (!this.$store.state.loadingStudies) {
                this.$store.state.loadingStudies = true
            }
            // Fall back to loading the visit in main thread (bad user experience!)
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
                            // 0.1 release only supports radiology studies; print warning for others
                            if (scope !== 'radiology') {
                                console.warn(`A ${scope} study was included in the dataset, but this feature is not yet available!`)
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
            this.toggleMenu(false)
        },
        toggleColorTheme: function (light?: boolean) {
            const appEl = document.getElementById(`${this.$store.state.appName}-medimg-viewer`)
            if (appEl) {
                appEl.classList.add('medimg-viewer-theme-change')
                this.$nextTick(() => {
                    if (light === undefined) {
                        if (appEl.classList.contains('medimg-viewer-dark-mode')) {
                            appEl.classList.remove('medimg-viewer-dark-mode')
                            appEl.classList.add('medimg-viewer-light-mode')
                        } else {
                            appEl.classList.remove('medimg-viewer-light-mode')
                            appEl.classList.add('medimg-viewer-dark-mode')
                        }
                    } else if (light) {
                        appEl.classList.remove('medimg-viewer-dark-mode')
                        appEl.classList.add('medimg-viewer-light-mode')
                    } else {
                        appEl.classList.remove('medimg-viewer-light-mode')
                        appEl.classList.add('medimg-viewer-dark-mode')
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
                    appEl.classList.remove('medimg-viewer-theme-change')
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
        this.$store.commit('set-settings-value', { field: 'eeg.groupSpacing', value: 1.25 })
    },
})

</script>

<style>
/* Global app styles */
.medimg-viewer-theme-change, .medimg-viewer-theme-change * {
    -ms-transition: background-color 1.0s ease, border-color 1.0s ease;
    -moz-transition: background-color 1.0s ease, border-color 1.0s ease;
    -webkit-transition: background-color 1.0s ease, border-color 1.0s ease;
    transition: background-color 1.0s ease, border-color 1.0s ease;
}
.medimg-viewer-dark-mode, .medimg-viewer-dark-mode * {
    --medimg-viewer-background: #000000;
    --medimg-viewer-background-highlight: #181818;
    --medimg-viewer-background-emphasize: #303030;
    --medimg-viewer-background-modal: rgba(0, 0, 0, 0.7);
    --medimg-viewer-border: #C0C0C0;
    --medimg-viewer-border-faint: #606060;
    --medimg-viewer-border-highlight: #F0F0F0;
    --medimg-viewer-text-main: #E0E0E0;
    --medimg-viewer-text-highlight: #F0F0F0;
    --medimg-viewer-text-minor: #C0C0C0;
    --medimg-viewer-text-faint: #808080;
}
.medimg-viewer-light-mode, .medimg-viewer-light-mode * {
    --medimg-viewer-background: #FFFFFF;
    --medimg-viewer-background-highlight: #F8F8F8;
    --medimg-viewer-background-emphasize: #F0F0F0;
    --medimg-viewer-background-modal: rgba(255, 255, 255, 0.7);
    --medimg-viewer-border: #808080;
    --medimg-viewer-border-faint: #A0A0A0;
    --medimg-viewer-border-highlight: #404040;
    --medimg-viewer-text-main: #303030;
    --medimg-viewer-text-highlight: #101010;
    --medimg-viewer-text-minor: #606060;
    --medimg-viewer-text-faint: #909090;
}
/* Use prettier and more consistent scrollbars */
.medimg-viewer *::-webkit-scrollbar {
    width: 0px;
    height: 0px;
}
.medimg-viewer *::-webkit-scrollbar-thumb {
    color: var(--medimg-viewer-border-faint);
    border-radius: 5px;
}
.medimg-viewer *::-webkit-scrollbar-track-piece {
    background-color: transparent;
}
/* Main app view component styles */
.medimg-viewer {
    position: relative;
    width: 100%;
    height: 100%;
    color: var(--medimg-viewer-text-main);
    background-color: var(--medimg-viewer-background);
}
.medimg-viewer * {
    /* Don't allow selecting text by default */
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    font-family: sans-serif;
    /* Set scrollbar width for Firefox */
    scrollbar-width: none;
}
    .medimg-viewer div {
        box-sizing: border-box;
    }
    .medimg-viewer-disabled {
        opacity: 0.5;
        cursor: default;
    }
    .medimg-viewer-hidden {
        display: none !important;
    }
    .medimg-viewer-oneliner {
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }
    .medimg-viewer-settings {
        position: absolute;
        inset: 0;
        z-index: 9;
        background-color: var(--medimg-viewer-background-modal);
    }
    .medimg-viewer-interface-dropdown {
        position: absolute;
        top: 10px;
        left: 10px;
        height: 60px;
        width: 280px;
        border: solid 2px var(--medimg-viewer-border);
        border-radius: 5px;
        background-color: var(--medimg-viewer-background);
        font-size: 24px;
        line-height: 56px;
        font-size: 16px;
        cursor: pointer;
        opacity: 0.8;
        z-index: 1;
        transition: left 0.5s;
    }
        .medimg-viewer-interface-dropdown-open {
            opacity: 1.0;
            height: auto;
        }
        .medimg-viewer-interface-dropdown.medimg-viewer-sidebar-closed {
            left: -230px;
        }
        .medimg-viewer-interface-dropdown > div {
            width: 210px;
            height: 56px;
            margin: 0 10px;
            font-size: 18px;
        }
        .medimg-viewer-interface-dropdown > svg {
            position: absolute;
            right: 10px;
            top: 10px;
            font-size: 36px;
            opacity: 0.5;
        }
            .medimg-viewer-interface-dropdown > svg:hover {
                opacity: 0.75;
            }
        .medimg-viewer-interface-dropdown > ul {
            display: none;
            width: 100%;
            list-style-type: none;
            margin: 0;
            padding: 0;
            margin-block-start: 0;
            margin-block-end: 0;
            padding-inline-start: 0;
        }
            .medimg-viewer-interface-dropdown > ul > li > div {
                line-height: 30px;
                padding: 5px 10px;
            }
                .medimg-viewer-interface-dropdown > ul > li > .medimg-viewer-visit-title {
                    font-weight: bold;
                    cursor: default;
                    border-top: solid 1px var(--medimg-viewer-border-faint);
                    background-color: var(--medimg-viewer-background-emphasize);
                }
                .medimg-viewer-interface-dropdown > ul > li .medimg-viewer-visit-date {
                    height: 20px;
                    line-height: 20px;
                    font-size: 80%;
                    font-weight: normal;
                    color: var(--medimg-viewer-text-minor);
                    background-color: var(--medimg-viewer-background-emphasize);
                }
                .medimg-viewer-interface-dropdown > ul > li > .medimg-viewer-visit-studies {
                    padding-left: 15px;
                }
                .medimg-viewer-interface-dropdown > ul > li > .medimg-viewer-visit-studies:hover {
                    background-color: var(--medimg-viewer-background-highlight);
                }
        .medimg-viewer-interface-dropdown-open > ul {
            display: block;
        }
    .medimg-viewer-settings-button {
        position: absolute;
        right: 0px;
        top: 10px;
        padding-left: 10px;
        z-index: 10; /* On top of modal */
        background-color: var(--medimg-viewer-background);
    }
    .medimg-viewer-settings-menu {
        position: absolute;
        top: 80px;
        right: 10px;
        background-color: var(--medimg-viewer-background);
        border-left: solid 1px var(--medimg-viewer-border-faint);
        border-bottom: solid 1px var(--medimg-viewer-border-faint);
        z-index: 5;
    }
        .medimg-viewer-settings-menu-row {
            height: 32px;
            line-height: 32px;
            padding: 0 10px;
            cursor: pointer;
        }
            .medimg-viewer-settings-menu-row:hover {
                background-color: var(--medimg-viewer-background-emphasize);
            }
            .medimg-viewer-settings-menu-row > svg {
                margin-right: 5px;
            }
</style>
