<template>

    <div :id="`${appName}-medigi-viewer`" class="medigi-viewer medigi-viewer-dark-mode">
        <div class="medigi-viewer-toolbar">
            <ViewerToolbar
                :canLink="canLink"
                v-on:link-all-stacks="linkAllStacks($event)"
            >
            </ViewerToolbar>
        </div>
        <div class="medigi-viewer-sidebar">
            <ViewerSidebar
                :appName="appName"
                :items="dicomElements"
                :activeItems="activeElements"
                v-on:file-dropped="handleFileDrop($event)"
                v-on:toggle-item="toggleSidebarItem($event)"
            >
            </ViewerSidebar>
        </div>
        <div ref="media" class="medigi-viewer-media">
            <div v-if="!dicomElements.length" :id="`${appName}-medigi-viewer-dropzone2`" class="medigi-viewer-dropzone"></div>
            <div v-else class="medigi-viewer-images">
                <DICOMImageDisplay v-for="(resource, idx) in activeElements"
                    :key="`${appName}-medigi-viewer-element-${dicomElements[resource].id}`"
                    :ref="`dicom-element`"
                    :containerSize="mediaContainerSize"
                    :isLinked="linkedElements.indexOf(resource) !== -1"
                    :linkedStackPos="linkedStackPos"
                    :listPosition="[idx, activeElements.length]"
                    :resource="dicomElements[resource]"
                    v-on:resource-linked="resourceLinked(idx, $event)"
                    v-on:scroll-linked-stacks="scrollLinkedStacks(idx, $event)"
                >
                </DICOMImageDisplay>
            </div>
        </div>
    </div>

</template>

<script lang="ts">

import Vue from 'vue'
import cornerstone, { imageCache } from 'cornerstone-core'
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader'
import dicomParser from 'dicom-parser'
import ResizeObserver from 'resize-observer-polyfill'
import { ImageResource, ImageStackResource }from '../types/assets'
import DICOMImage from '../assets/dicom/DICOMImage'
import DICOMImageStack from '../assets/dicom/DICOMImageStack'
import LocalFileLoader from '../assets/loaders/LocalFileLoader'

export default Vue.extend({
    components: {
        DICOMImageDisplay: () => import('./DICOMImageDisplay.vue'),
        ViewerSidebar: () => import('./AppSidebar.vue'),
        ViewerToolbar: () => import('./AppToolbar.vue'),
    },
    props: {
        appName: String,
    },
    data () {
        return {
            cornerstone: cornerstone,
            // Loaded elements
            activeElements: [] as number[],
            dicomElements: [] as ImageResource[] | ImageStackResource[],
            linkedElements: [] as number[],
            // Other properties
            linkedStackPos: null as object | null,
            mediaContainerSize: [0, 0],
            themeChange: 0,
            wadoImageLoader: null,
        }
    },
    computed: {
        /**
         * Check if visible stacks can be linked.
         */
        canLink (): boolean {
            // Display link icon if there are no items visible
            if (!this.activeElements.length) {
                return true
            }
            for (let i=0; i<this.activeElements.length; i++) {
                // If even one of the active elements is not linked and can be linked, return true
                if (this.dicomElements[this.activeElements[i]] instanceof DICOMImageStack
                    && this.linkedElements.indexOf(this.activeElements[i]) === -1
                ) {
                    return true
                }
            }
            return false
        },
    },
    methods: {
        addFileAsImage: function (file: File) {
            const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file)
            if (imageId) {
                (this.dicomElements as ImageResource[]).push(new DICOMImage(file.name, file.size, imageId))
            }
        },
        addFilesAsImageStack: function (files: File[], name: string) {
            if (!files.length) {
                return
            }
            const imgStack = new DICOMImageStack(files.length, name || 'Image stack')
            for (let i=0; i<files.length; i++) {
                const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(files[i])
                if (imageId) {
                    imgStack.push(
                        new DICOMImage(files[i].name, files[i].size, imageId)
                    )
                }
            }
            // Don't add an empty image stack
            if (imgStack.length) {
                // Add cover image
                (this.dicomElements as ImageStackResource[]).push(imgStack)
            }
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

        handleFileDrop: async function (event: DragEvent) {
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
                            // Add multiple files as an image stack
                            this.addFilesAsImageStack(rootDir.files.map(f => f.file as File), rootDir.name)
                        } else {
                            // Single file as an image
                            this.addFileAsImage(rootDir.files[0].file as File)
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
                            }
                            // Add the files of each directory as a separate image stack
                            this.addFilesAsImageStack(
                                (rootDir.directories[i].files || []).map(f => f.file as File),
                                rootDir.directories[i].name
                            )
                        }
                    } else {
                        console.warn("Dropped item had an empty root directory!")
                    }
                }
            }).catch((error: Error) => {
                // TODO: Implement errors in the file loader
            })
        },
        linkAllStacks: function (value: boolean) {
            console.log(this.activeElements)
            console.log(this.linkedElements)
            const dcmEls = this.$refs['dicom-element'] as any[]
            // Try to link all active DICOM elements
            for (let i=0; i<dcmEls.length; i++) {
                dcmEls[i].linkImageStack(value)
            }
        },
        mediaResized: function () {
            this.mediaContainerSize = [
                (this.$refs['media'] as HTMLElement).offsetWidth,
                (this.$refs['media'] as HTMLElement).offsetHeight
            ]
        },
        resourceLinked: function (index: number, value: boolean) {
            if (this.activeElements.indexOf(index) === -1) {
                return
            }
            // Add element index to selectedElements, if not already there
            if (value && this.linkedElements.indexOf(index) == -1) {
                this.linkedElements.push(index)
            }
            // Or remove it if present
            if (!value && this.linkedElements.indexOf(index) !== -1) {
                this.linkedElements.splice(
                    this.linkedElements.indexOf(index), 1
                )
            }
        },
        scrollLinkedStacks: async function (oIndex: number, oPos: number): Promise<boolean> {
            // Check the appropriate number of frames to scroll each individual stack
            if (!(this.dicomElements[oIndex] instanceof DICOMImageStack)) {
                console.log("Not an image stack")
                return false
            }
            this.linkedStackPos = { pos: oPos, origin: this.dicomElements[oIndex].id }
            return true
        },
        toggleColorTheme: function (light?: boolean) {
            const appEl = document.getElementById(`${this.appName}-medigi-viewer`)
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
        toggleSidebarItem: function (itemIdx: number) {
            // Add or remove intemIdx from active items
            const actIdx = this.activeElements.indexOf(itemIdx)
            if (actIdx !== -1) {
                this.activeElements.splice(actIdx, 1)
                if (this.linkedElements.indexOf(actIdx) !== -1) {
                    // Also remove from linked elements
                    this.linkedElements.splice(actIdx, 1)
                }
            } else {
                this.activeElements.push(itemIdx)
                // Sort the items in the correct order
                this.activeElements.sort((a, b) => {
                    return a - b
                })
            }
        },
    },
    mounted () {
        // Set up WADO Image Loader
        cornerstoneWADOImageLoader.external.cornerstone = this.cornerstone
        cornerstoneWADOImageLoader.external.dicomParser = dicomParser
        /* Set up DICOM file dropzone
        const dropZone = document.getElementById(`${this.appName}-medigi-viewer-dropzone2`)
        if (dropZone) {
            dropZone.addEventListener('dragover', this.handleFileDrag, false)
            dropZone.addEventListener('drop', this.handleFileDrop, false)
        } */
        // Set up resize observer for the media container
        new ResizeObserver(this.mediaResized).observe((this.$refs['media'] as Element))
    },
})

</script>

<style>
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
    --medigi-viewer-background-highlight: #D0D0D0;
    --medigi-viewer-border: #303030;
    --medigi-viewer-border-faint: #A0A0A0;
    --medigi-viewer-border-highlight: #101010;
    --medigi-viewer-text-main: #202020;
    --medigi-viewer-text-highlight: #101010;
    --medigi-viewer-text-minor: #404040;
    --medigi-viewer-text-faint: #808080;
}
/* Main app view component styles */
.medigi-viewer div {
    box-sizing: border-box;
}
.medigi-viewer {
    display: grid;
    grid-template-columns: [left-edge] 300px [divider] auto [right-edge];
    grid-template-rows: [top-edge] 80px [divider] auto [bottom-edge];
    height: 100%;
    width: 100%;
    color: var(--medigi-viewer-text-main);
    background-color: var(--medigi-viewer-background);
    font-family: sans-serif;
}
    .medigi-viewer-sidebar {
        grid-column-start: left-edge;
        grid-column-end: divider;
        grid-row-start: top-edge;
        grid-row-end: bottom-edge;
    }
    .medigi-viewer-toolbar {
        grid-column-start: divider;
        grid-row-start: top-edge;
        grid-row-end: divider;
    }
    .medigi-viewer-media {
        grid-column-start: divider;
        grid-row-start: divider;
        overflow: hidden; /* Without this DICOM elements do not scale down */
    }
        .medigi-viewer-dropzone {
            width: 100%;
            height: 100%;
        }
        .medigi-viewer-images {
        }
</style>
