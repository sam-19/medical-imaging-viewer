<template>

    <div :id="`${appName}-medigi-viewer`" class="medigi-viewer medigi-viewer-dark-mode">
        <div class="medigi-viewer-toolbar">
            <ViewerToolbar></ViewerToolbar>
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
            <div v-if="this.$store.state.activeItems.length" class="medigi-viewer-images">
                <DICOMImageDisplay v-for="(resource, idx) in this.$store.state.activeItems"
                    :key="`${appName}-medigi-viewer-element-${resource}`"
                    ref="dicom-element"
                    :containerSize="mediaContainerSize"
                    :listPosition="idx"
                    :resource="getItemById(resource)"
                >
                </DICOMImageDisplay>
            </div>
            <div v-else><!-- TODO: Placeholder div --></div>
        </div>
    </div>

</template>

<script lang="ts">

import Vue from 'vue'
import cornerstone, { imageCache } from 'cornerstone-core'
import cornerstoneMath from 'cornerstone-math'
import cornerstoneTools from 'cornerstone-tools'
import Hammer from 'hammerjs'
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader'
import dicomParser from 'dicom-parser'
import ResizeObserver from 'resize-observer-polyfill'
import { ImageResource, ImageStackResource }from '../types/assets'
import DICOMImage from '../assets/dicom/DICOMImage'
import DICOMImageStack from '../assets/dicom/DICOMImageStack'
import LocalFileLoader from '../assets/loaders/LocalFileLoader'
import { MutationTypes } from '../store'
import DICOMMedia from '../assets/dicom/DICOMMedia'
import DICOMDataProperty from '../assets/dicom/DICOMDataProperty'

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
            synchronizer: null as any,
            // Loaded elements
            activeElements: [] as number[],
            dicomElements: [] as ImageResource[] | ImageStackResource[],
            // Other properties
            ctrlDown: false,
            ctrlRegistered: false,
            mediaContainerSize: [0, 0],
            themeChange: 0,
            wadoImageLoader: null,
        }
    },
    computed: {
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
        getItemById: function (id: string): ImageResource | ImageStackResource | undefined {
            for (let i=0; i<this.dicomElements.length; i++) {
                if (this.dicomElements[i].id === id) {
                    return this.dicomElements[i]
                }
            }
            return undefined
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
                            if (!rootDir.path) {
                                // If this is the "pseudo" root directory, add files as separate images
                                // (as they were dragged as separate files into the viewer)
                                for (let i=0; i<rootDir.files.length; i++) {
                                    this.addFileAsImage(rootDir.files[i].file as File)
                                }
                            } else {
                                // Add multiple files as an image stack
                                this.addFilesAsImageStack(rootDir.files.map(f => f.file as File), rootDir.name)
                            }
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
        mediaResized: function () {
            // Deduct padding and borders from element dimensions
            this.mediaContainerSize = [
                (this.$refs['media'] as HTMLElement).offsetWidth - 2,
                (this.$refs['media'] as HTMLElement).offsetHeight - 2
            ]
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
        // Set up Cornerstone Tools
        cornerstoneTools.external.cornerstone = this.cornerstone
        cornerstoneTools.external.cornerstoneMath = cornerstoneMath
        cornerstoneTools.external.Hammer = Hammer
        cornerstoneTools.init()
        // Set up WADO Image Loader
        cornerstoneWADOImageLoader.external.cornerstone = this.cornerstone
        cornerstoneWADOImageLoader.external.dicomParser = dicomParser
        this.synchronizer = new cornerstoneTools.Synchronizer(
            'cornerstonetoolsstackscroll',
            (synchronizer: any, source: any, target: any, event: any) => {
                // Get the item id from element id
                const srcId = source.id.split('-').pop()
                const tgtId = target.id.split('-').pop()
                let srcEl, tgtEl = null
                for (let i=0; i<this.dicomElements.length; i++) {
                    if (this.dicomElements[i].id === srcId) {
                        srcEl = this.dicomElements[i]
                    } else if (this.dicomElements[i].id === tgtId) {
                        tgtEl = this.dicomElements[i]
                    }
                }
                // Make sure that this is an actual active element and an actual scroll event
                if (srcEl === null || this.$store.state.activeItems.indexOf(srcId) === -1 || !event) {
                    return
                }
                // Synchronize stack position
                srcEl = (srcEl as DICOMImageStack)
                srcEl.currentPosition = event.newImageIdIndex
                // Check if control key is down (force scroll)
                if (this.ctrlDown) {
                    const relPos = (srcEl.currentPosition - (srcEl.linkedPosition || 0))/srcEl.images.length
                            + (srcEl.masterLinkPosition || 0)
                    this.$store.commit('set-linked-scroll-position', { origin: srcId, position: relPos })
                    return
                }
                // Determine if target element should be synchronized with source element
                if (this.$store.state.linkedItems.indexOf(source) === -1 ||
                    this.$store.state.linkedItems.indexOf(target) === -1 ||
                    source === target
                ) {
                    // Source or target is not linked, or they are the same element
                    return
                }
                const enabledSrc: any = cornerstone.getEnabledElement(source)
                const enabledTgt: any = cornerstone.getEnabledElement(target)
                // Check that all required metadata is available
                if (!enabledSrc.image || !enabledTgt.image ||
                    !enabledSrc.image.imageId || !enabledTgt.image.imageId
                ) {
                    return
                }
                const sourcePlane: any = (cornerstone.metaData.get('imagePlaneModule', enabledSrc.image.imageId) as any)
                const targetPlane: any = (cornerstone.metaData.get('imagePlaneModule', enabledTgt.image.imageId) as any)
                if (!sourcePlane || !sourcePlane.columnCosines || !sourcePlane.rowCosines ||
                    !targetPlane || !targetPlane.columnCosines || !targetPlane.rowCosines
                ) {
                    return
                }
                // The built-in synchronizer may attemp to synchronize images in different orientations, which may lead to weird results.
                // Check for compatible orientations by calculating the angle between the two image plane vectors.
                const sourceV = (new cornerstoneMath.Vector3(...sourcePlane.columnCosines))
                                .cross(new cornerstoneMath.Vector3(...sourcePlane.rowCosines))
                const targetV = (new cornerstoneMath.Vector3(...targetPlane.columnCosines))
                                .cross(new cornerstoneMath.Vector3(...targetPlane.rowCosines))
                // Tolerance of Pi/12 = 15 degrees.
                // A difference of 1*Pi means the vectors are inverted, but at least flipping the view doesn't result in this.
                // Will have to consider adding a special case if such examples turn up later.
                if (sourceV.angleTo(targetV) > Math.PI/12) {
                    return
                }
                // We can use the built-in synchronizer for images that have nearly or examptly the same orientation
                cornerstoneTools.stackImagePositionSynchronizer(synchronizer, source, target, event)
            }
        )
        // Set up resize observer for the media container
        new ResizeObserver(this.mediaResized).observe((this.$refs['media'] as Element))
        // Monitor control key down state
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Control' && !this.ctrlRegistered) {
                // Refresh linked position and master stack position in each active stack element
                for (let i=0; i<this.dicomElements.length; i++) {
                    if (this.$store.state.activeItems.indexOf(this.dicomElements[i].id) !== -1 && this.dicomElements[i].isStack) {
                        ;(this.dicomElements[i] as ImageStackResource).linkedPosition = (this.dicomElements[i] as ImageStackResource).currentPosition
                        ;(this.dicomElements[i] as ImageStackResource).masterLinkPosition = this.$store.state.linkedScrollPosition
                    }
                }
                this.ctrlDown = true
                this.ctrlRegistered = true // Prevent event from registering repeatedly
            }
        })
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Control') {
                this.ctrlDown = false
                this.ctrlRegistered = false
            }
        })
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
.medigi-viewer * {
    /* Don't allow selecting text by default */
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}
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
        margin: 0 10px 10px 0;
        border: 1px solid var(--medigi-viewer-border-faint);
        overflow: hidden; /* Without this DICOM elements do not scale down */
    }
        .medigi-viewer-images {
        }
</style>
