<template>

    <div :id="`${$store.state.appName}-medigi-viewer`" class="medigi-viewer medigi-viewer-dark-mode">
        <div :class="[
            'medigi-viewer-interface-dropdown',
            { 'medigi-viewer-sidebar-closed': !sidebarOpen },
        ]">
            <span>DROP A FILE BELOW</span>
            <font-awesome-icon
                :icon="sidebarOpen ? ['fas', 'chevron-square-left'] : ['fas', 'chevron-square-right']"
                :title="sidebarOpen ? $t('Close sidebar') : $t('Open sidebar')"
                @click="toggleSidebar"
            />
            <ul>
                <!--<li>LIST OF OPTIONS</li>-->
            </ul>
        </div>
        <dicom-image-interface v-if="scope==='radiology'"
            ref="dicom-image-interface"
            :resources="dicomElements"
            :sidebarOpen="sidebarOpen"
        />
        <dicom-waveform-interface v-else-if="scope==='ekg'"
            ref="dicom-waveform-interface"
            :resources="ekgResources"
            :sidebarOpen="sidebarOpen"
        />
    </div>

</template>

<script lang="ts">

import Vue from 'vue'
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader'
import { ImageResource, ImageStackResource, StudyObject } from '../types/assets'
import DicomImage from '../assets/dicom/DicomImage'
import DicomImageStack from '../assets/dicom/DicomImageStack'
import DicomWaveform from '../assets/dicom/DicomWaveform'
import GenericStudyLoader from '../assets/loaders/GenericStudyLoader'
import LocalFileLoader from '../assets/loaders/LocalFileLoader'

export default Vue.extend({
    components: {
        DicomImageInterface: () => import('./Radiology/DICOM/DicomImageInterface.vue'),
        DicomWaveformInterface: () => import('./EKG/DICOM/DicomWaveformInterface.vue'),
    },
    data () {
        return {
            scope: 'radiology',
            sidebarOpen: true,
            // Loaded DICOM elements
            dicomElements: [] as ImageResource[] | ImageStackResource[],
            ekgResources: [] as DicomWaveform[],
            // Theme change trigger
            themeChange: 0,
            // Screen DPI
            screenDPI: 144,
        }
    },
    computed: {
    },
    methods: {
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
                    const studyLoader = new GenericStudyLoader()
                    studyLoader.loadFromFileSystem(fileTree).then(studyDict => {
                        const studies = Object.values(studyDict)
                        let topoImage = null as ImageResource | null
                        studies.forEach((study: any) => {
                            const types = study.type.split(':')
                            if (study.scope === 'radiology') {
                                if (types[0] === 'image') {
                                    if (study.format === 'dicom') {
                                        // Data element should always be a loaded file
                                        const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(study.data)
                                        if (imageId) {
                                            if (types.length === 1) {
                                                // Add a single image
                                                (this.dicomElements as ImageResource[]).push(new DicomImage(
                                                    study.name, study.data.size, imageId
                                                ))
                                            } else if (types[1] === 'series') {
                                                // Add an image stack
                                                const imgStack = new DicomImageStack(study.files.length, study.name)
                                                // Add all loaded files
                                                for (let i=0; i<study.files.length; i++) {
                                                    const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(study.files[i])
                                                    if (imageId) {
                                                        imgStack.push(
                                                            new DicomImage(study.files[i].name, study.files[i].size, imageId)
                                                        )
                                                    }
                                                }
                                                // Add URLs that haven't been loaded yet
                                                for (let i=0; i<study.urls.length; i++) {
                                                    if (imageId) {
                                                        imgStack.push(
                                                            new DicomImage(`${study.name}-${i}`, 0, `wadouri:${study.urls[i]}`)
                                                        )
                                                    }
                                                }
                                                // Don't add an empty image stack (WADOImageLoader may have failed adding local files)
                                                if (imgStack.length) {
                                                    (this.dicomElements as ImageStackResource[]).push(imgStack)
                                                }
                                            } else if (types[1] === 'topogram') {
                                                // Add as a topogram image
                                                topoImage = new DicomImage(study.name, study.data.size, imageId)
                                            }
                                        }
                                    }
                                }
                            } else if (study.scope === 'ekg') {
                                // Add EKG record
                                this.ekgResources.push(new DicomWaveform(study.name, study.data))
                                this.scope = 'ekg'
                                this.toggleColorTheme(true)
                            }
                        })
                        // Attach possible topogram image to all loaded stacks
                        if (topoImage !== null) {
                            this.dicomElements.forEach((resource: ImageResource | ImageStackResource) => {
                                if (resource.isStack) {
                                    (resource as ImageStackResource).topogram = topoImage
                                }
                            })
                        }
                    })
                }
            }).catch((e: Error) => {
                // TODO: Implement errors in the file loader
            })
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
        toggleSidebar: function () {
            this.sidebarOpen = !this.sidebarOpen
        },
    },
    mounted () {
        this.$root.$on('add-ekg-resource', (resource: any) => {
            this.ekgResources.push(resource)
            this.scope = 'ekg'
            this.toggleColorTheme(true)
        })
        // Measure 1 inch in pixels for later trace calibration
        //const el = document.createElement('div')
        //el.style.width = '1in'
        //document.body.appendChild(el)
        //const dpi = el.offsetWidth
        //document.body.removeChild(el)
        //this.screenDPI = dpi
    },
})

</script>

<style>
/* Page layout */
body {
    margin: 0;
}
/* Global app styles */
.medigi-viewer-theme-change, .medigi-viewer-theme-change * {
    -moz-transition: color 1.0s linear, background-color 1.0s linear, border-color 1.0s linear;
    -ms-transition: color 1.0s linear, background-color 1.0s linear, border-color 1.0s linear;
    -webkit-transition: color 1.0s linear, background-color 1.0s linear, border-color 1.0s linear;
    transition: color 2.0s linear, background-color 2.0s linear, border-color 2.0s linear;
}
.medigi-viewer-dark-mode, .medigi-viewer-dark-mode * {
    --medigi-viewer-background: #000000;
    --medigi-viewer-background-highlight: #303030;
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
    --medigi-viewer-background-highlight: #F0F0F0;
    --medigi-viewer-border: #808080;
    --medigi-viewer-border-faint: #A0A0A0;
    --medigi-viewer-border-highlight: #404040;
    --medigi-viewer-text-main: #303030;
    --medigi-viewer-text-highlight: #101010;
    --medigi-viewer-text-minor: #606060;
    --medigi-viewer-text-faint: #909090;
}
/* Use prettier and more consistent scrollbars */
::-webkit-scrollbar {
    width: 10px;
    height: 10px;
}
::-webkit-scrollbar-thumb {
    color: var(--medigi-viewer-border-faint);
    border-radius: 5px;
}
::-webkit-scrollbar-track-piece {
    background-color: transparent;
}
/* Main app view component styles */
.medigi-viewer * {
    /* Don't allow selecting text by default */
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    /* Set scrollbar width for Firefox */
    scrollbar-width: 10px;
    /* Main layout */
    position: relative;
}
    .medigi-viewer div {
        box-sizing: border-box;
    }
    .medigi-viewer-hidden {
        display: none !important;
    }
    .medigi-viewer-interface-dropdown {
        position: absolute;
        top: 10px;
        left: 10px;
        min-height: 60px;
        width: 280px;
        border: solid 2px var(--medigi-viewer-border);
        border-radius: 5px;
        background-color: var(--medigi-viewer-background);
        font-size: 24px;
        line-height: 56px;
        font-size: 16px;
        color: var(--medigi-viewer-text-main);
        font-family: sans-serif;
        cursor: pointer;
        opacity: 0.8;
        z-index: 1;
        transition: left 0.5s;
    }
        .medigi-viewer-interface-dropdown:hover {
            opacity: 1.0;
        }
        .medigi-viewer-interface-dropdown.medigi-viewer-sidebar-closed {
            left: -230px;
        }
        .medigi-viewer-interface-dropdown > span {
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
            margin-block-start: 0;
            margin-block-end: 0;
            padding-inline-start: 0;
        }
            .medigi-viewer-interface-dropdown > ul > li {
                height: 40px;
                line-height: 40px;
                padding: 0 10px;
            }
                .medigi-viewer-interface-dropdown > ul > li:hover {
                    background-color: var(--medigi-viewer-background-highlight);
                }
        .medigi-viewer-interface-dropdown:hover > ul {
            display: block;
        }
</style>
