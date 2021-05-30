<template>

    <div :id="`${$store.state.appName}-medigi-viewer`" class="medigi-viewer medigi-viewer-dark-mode">
        <div :class="[
            'medigi-viewer-settings',
            { 'medigi-viewer-hidden': !settingsOpen },
        ]">
            <viewer-settings :scope="scope"></viewer-settings>
        </div>
        <div :class="[
            'medigi-viewer-interface-dropdown',
            { 'medigi-viewer-sidebar-closed': !sidebarOpen },
        ]">
            <div v-if="activeVisit" class="medigi-viewer-oneliner">{{ getVisitTitle() }}</div>
            <div v-else class="medigi-viewer-oneliner">{{ t('No visit selected') }}</div>
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
                @button-clicked="toggleSettings()"
            />
        </div>
        <dicom-image-interface v-if="scope==='radiology'"
            ref="dicom-image-interface"
            :loadingStudies="loadingStudies"
            :resources="activeVisit ? activeVisit.studies.radiology : []"
            :sidebarOpen="sidebarOpen"
            v-on:update-item-order="updateDicomImageOrder"
        />
        <dicom-waveform-interface v-else-if="scope==='ekg'"
            ref="dicom-waveform-interface"
            :loadingStudies="loadingStudies"
            :resources="activeVisit ? activeVisit.studies.ekg : []"
            :sidebarOpen="sidebarOpen"
        />
        <eeg-interface v-else-if="scope==='eeg'"
            ref="eeg-interface"
            :loadingStudies="loadingStudies"
            :resources="activeVisit ? activeVisit.studies.eeg : []"
            :sidebarOpen="sidebarOpen"
        />
    </div>

</template>

<script lang="ts">

import Vue from 'vue'
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader'
import { FileSystemItem } from '../types/common'
import { ImageResource } from '../types/radiology'
import { PatientVisit } from '../types/viewer'
import DicomImage from '../assets/dicom/DicomImage'
import DicomWaveform from '../assets/dicom/DicomWaveform'
import GenericStudyLoader from '../assets/loaders/GenericStudyLoader'
import LocalFileLoader from '../assets/loaders/LocalFileLoader'
import EdfSignal from '../assets/edf/EdfEegSignal'

export default Vue.extend({
    components: {
        DicomImageInterface: () => import(/* webpackChunkName: "radiology" */'./Radiology/Dicom/DicomImageInterface.vue'),
        DicomWaveformInterface: () => import(/* webpackChunkName: "ekg" */'./EKG/Dicom/DicomWaveformInterface.vue'),
        EegInterface: () => import(/* webpackChunkName: "eeg" */'./EEG/EegInterface.vue'),
        ViewerSettings: () => import('./ViewerSettings.vue'),
        ToolbarButton: () => import('./ToolbarButton.vue'),
    },
    data () {
        return {
            scope: this.$store.state.SETTINGS.scopePriority[0] || 'radiology',
            sidebarOpen: true,
            loadingStudies: false,
            visits: [] as PatientVisit[],
            selectedVisit: null as PatientVisit|null,
            settingsOpen: false,
            // Theme change trigger
            themeChange: 0,
        }
    },
    watch: {
        scope: function (old, val) {
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
            fileLoader.readFilesFromSource(event).then((fileTree) => {
                if (fileTree) {
                    this.loadStudiesFromFsItem(fileTree)
                }
            }).catch((e: Error) => {
                // TODO: Implement errors in the file loader
            })
        },
        /**
         * Load studies from a given FilesystemItem.
         * @param fsItem FilesystemItem to load
         */
        loadStudiesFromFsItem: function (fsItem: FileSystemItem) {
            const studyLoader = new GenericStudyLoader()
            this.loadingStudies = true
            studyLoader.loadFromFileSystem(fsItem).then(visits => {
                let visitCounter = 1
                for (const { title, date, studies } of visits) {
                    // Don't add empty visits
                    if (!studies.length) {
                        continue
                    }
                    const visit = {
                        title: title || this.$t(`Visit #${visitCounter++}`),
                        date: date || '',
                        studies: { eeg: [], ekg: [], radiology: [] },
                    } as any
                    let topoImage = null as ImageResource | null
                    for (const study of studies) {
                        const types = study.type.split(':')
                        if (study.scope === 'radiology') {
                            if (types[0] === 'image') {
                                if (study.format === 'dicom') {
                                    // Data element should always be a loaded file
                                    const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(study.data)
                                    if (imageId) {
                                        if (types.length === 1) {
                                            // Add a single image
                                            (visit.studies.radiology as ImageResource[]).push(
                                                new DicomImage(
                                                    study.meta.modality, study.name, study.data.size, study.type, imageId
                                                )
                                            )
                                        } else if (types[1] === 'series') {
                                            // Add an image stack
                                            const imgStack = new DicomImage(
                                                study.meta.modality, study.name, study.files.length, study.type, ''
                                            )
                                            ;(visit.studies.radiology as ImageResource[]).push(imgStack)
                                            const resourceIdx = visit.studies.radiology.length - 1
                                            // Add all loaded files
                                            for (let i=0; i<study.files.length; i++) {
                                                const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(study.files[i])
                                                if (imageId) {
                                                    imgStack.push(
                                                        new DicomImage(
                                                            study.meta.modality,
                                                            study.files[i].name,
                                                            study.files[i].size,
                                                            study.type.split(':')[0],
                                                            imageId
                                                        )
                                                    )
                                                }
                                            }
                                            // Add URLs that haven't been loaded yet
                                            for (let i=0; i<study.urls.length; i++) {
                                                if (imageId) {
                                                    imgStack.push(
                                                        new DicomImage(
                                                            study.meta.modality,
                                                            `${study.name}-${i}`,
                                                            0,
                                                            study.type.split(':')[0],
                                                            `wadouri:${study.urls[i]}`
                                                        )
                                                    )
                                                }
                                            }
                                            // Don't add an empty image stack (WADOImageLoader may have failed adding local files)
                                            if (!imgStack.length) {
                                                visit.studies.radiology.splice(resourceIdx, 1)
                                            } else {
                                                // Set "middle" image as cover image
                                                const coverIdx = Math.floor(imgStack.length/2)
                                                imgStack.setCoverImage(coverIdx)
                                            }
                                        } else if (types[1] === 'topogram') {
                                            // Add as a topogram image
                                            topoImage = new DicomImage(
                                                study.meta.modality, study.name, study.data.size, study.type, imageId
                                            )
                                        }
                                    }
                                }
                            }
                        } else if (study.scope === 'ekg') {
                            // Add EKG record
                            visit.studies.ekg.push(new DicomWaveform(study.name, study.data))
                        } else if (study.format === 'edf') {
                            // Pass the EDF data to EdfSignal class to determine record type
                            const record = new EdfSignal(study.name, study.data, study.meta.loader)
                            if (record.type === 'eeg') {
                                // Add EEG record
                                visit.studies.eeg.push(record)
                            }
                        }
                    }
                    // Attach possible topogram image to all applicable stacks
                    if (topoImage !== null) {
                        for (const resource of visit.studies.radiology) {
                            if (resource.isStack && topoImage.modality === resource.modality) {
                                (resource as ImageResource).topogram = topoImage
                            }
                        }
                    }
                    this.visits.push(visit)
                    // Open the first loaded visit, if none is active
                    if (!this.selectedVisit) {
                        this.selectedVisit = visit
                        // Open the study with the highest priority
                        let bestScope = ''
                        const scopePrio = this.$store.state.SETTINGS.scopePriority
                        for (const scope in visit.studies) {
                            if (scopePrio.indexOf(scope) !== -1 && visit.studies[scope].length &&
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
                this.loadingStudies = false
            }).catch((reason) => {
                console.error(reason)
                this.loadingStudies = false
            })
            console.log(this.selectedVisit)
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
        toggleSettings: function () {
            this.settingsOpen = !this.settingsOpen
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
        this.$store.commit('set-settings-value', { field: 'eeg.yPadding', value: 1.5 })
        this.$store.commit('set-settings-value', { field: 'eeg.channelSpacing', value: 1 })
        this.$store.commit('set-settings-value', { field: 'eeg.groupSpacing', value: 1.5 })
        this.$store.commit('set-settings-value', { field: 'screenDPI', value: 96 })
    },
})

</script>

<style>
/* Global app styles */
.medigi-viewer-theme-change, .medigi-viewer-theme-change * {
    -ms-transition: color 1.0s ease, background-color 1.0s ease, border-color 1.0s ease;
    -moz-transition: color 1.0s ease, background-color 1.0s ease, border-color 1.0s ease;
    -webkit-transition: color 1.0s ease, background-color 1.0s ease, border-color 1.0s ease;
    transition: color 1.0s ease, background-color 1.0s ease, border-color 1.0s ease;
}
.medigi-viewer-dark-mode, .medigi-viewer-dark-mode * {
    --medigi-viewer-background: #000000;
    --medigi-viewer-background-emphasize: #181818;
    --medigi-viewer-background-highlight: #303030;
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
    --medigi-viewer-background-emphasize: #F8F8F8;
    --medigi-viewer-background-highlight: #F0F0F0;
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
        z-index: 2;
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
        .medigi-viewer-interface-dropdown:hover {
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
        .medigi-viewer-interface-dropdown:hover > ul {
            display: block;
        }
    .medigi-viewer-settings-button {
        position: absolute;
        right: 0px;
        top: 10px;
        z-index: 3;
    }
</style>
