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
            :items.sync="dicomElements"
            :sidebarOpen="sidebarOpen"
        />
        <dicom-waveform-interface v-else-if="scope==='ekg'"
            ref="dicom-waveform-interface"
            :ekgResources.sync="ekgResources"
            :sidebarOpen="sidebarOpen"
        />
    </div>

</template>

<script lang="ts">

import Vue from 'vue'
import { FileSystemItem, ImageResource, ImageStackResource } from '../types/assets'
import DicomWaveform from '../assets/dicom/DicomWaveform'
import LocalFileLoader from '../assets/loaders/LocalFileLoader'

const TOPOGRAM_NAME = '_topogram'

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
                    let rootDir = fileTree
                    while (rootDir.files && !rootDir.files.length &&
                           rootDir.directories && rootDir.directories.length === 1
                    ) {
                        // Recurse until we arrive at the root folder of the image sets
                        rootDir = rootDir.directories[0]
                    }
                    // Next, check if this is a single file dir or several dirs
                    if (!rootDir.directories?.length && rootDir.files?.length) {
                        if (rootDir.files.length > 1) {
                            if (!rootDir.path) {
                                // If this is the "pseudo" root directory, add files as separate images
                                // (as they were dragged as separate files into the viewer)
                            } else {
                                // Add multiple files as an image stack
                            }
                        } else {
                            // Single file as an image
                        }
                    } else if (rootDir.directories?.length) {
                        // Try to add each individual dir as an image or image stack
                        // First check that each directory really contains only files, skip those that don't
                        for (let i=0; i<rootDir.directories.length; i++) {
                            if (rootDir.directories[i].directories?.length) {
                                console.warn(`${rootDir.directories[i].path} was omitted because it contained subdirectories.`)
                                continue
                            } else if (!rootDir.directories[i].files?.length) {
                                console.warn(`${rootDir.directories[i].path} was omitted because it was empty.`)
                                continue
                            } else if (rootDir.directories[i].files?.length === 1) {
                                // Single file directory as single image
                                const overrideName = rootDir.directories[i].name === TOPOGRAM_NAME ? TOPOGRAM_NAME : undefined
                            } else {
                                // Add several files in a directory as a separate image stack
                            }
                        }
                    } else {
                        console.warn("Dropped item had an empty root directory!")
                    }
                }
            }).catch((error: Error) => {
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
    --medigi-viewer-background-highlight: #202020;
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
