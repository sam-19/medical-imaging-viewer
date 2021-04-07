<template>

    <div :id="`${$store.state.appName}-medigi-dicom-radiology-interface`"
        :class="[
            'medigi-viewer-dicom-image-interface',
            { 'medigi-viewer-sidebar-closed': !sidebarOpen },
        ]"
    >
        <div class="medigi-viewer-toolbar">
            <radiology-toolbar
                :allLinked="allResourcesLinked"
                :gridLayout.sync="gridLayout"
                :synchronizers="synchronizers"
                v-on:link-all-resources="linkAllResources"
            />
        </div>
        <div class="medigi-viewer-sidebar">
            <radiology-sidebar
                :allowSorting="!gridLayout || !gridLayout[0] || !gridLayout[1]"
                :dicomItems="resources"
                v-on:element-status-changed="updateElements"
                v-on:file-dropped="handleFileDrop"
                v-on:item-dropped="itemDropped"
                v-on:update-item-order="$emit('update-item-order', $event)"
            />
        </div>
        <div ref="media" class="medigi-viewer-media">
            <div class="medigi-viewer-images">
                <!-- Add active DICOM images and placeholders -->
                <component v-for="(resource, idx) in activeItems"
                    :is="resource ? 'dicom-image-display' : 'dicom-image-placeholder'"
                    :key="`${$store.state.appName}-medigi-viewer-element-${resource ? resource.id : idx}`"
                    ref="dicom-element"
                    :containerSize="mediaContainerSize"
                    :layoutPosition="getElementLayoutPosition(idx)"
                    :resource="resource"
                    :topogram="topogramElement"
                    :synchronizers="synchronizers"
                />
                <!-- Add a necessary amount of placeholder elements -->
                <dicom-image-placeholder v-for="idx in getEmptyLayoutCells()"
                    :key="`${$store.state.appName}-medigi-viewer-placeholder-${idx}`"
                    :containerSize="mediaContainerSize"
                    :layoutPosition="getElementLayoutPosition(idx)"
                />
            </div>
        </div>
    </div>

</template>

<script lang="ts">

import Vue from 'vue'
import * as cornerstone from 'cornerstone-core'
import cornerstoneMath from 'cornerstone-math'
import cornerstoneTools from 'cornerstone-tools'
import Hammer from 'hammerjs'
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader'
import dicomParser from 'dicom-parser'
import ResizeObserver from 'resize-observer-polyfill'
import { FileSystemItem, ImageResource, ImageStackResource } from '../../../types/assets'
import DicomImage from '../../../assets/dicom/DicomImage'
import DicomImageStack from '../../../assets/dicom/DicomImageStack'
import LocalFileLoader from '../../../assets/loaders/LocalFileLoader'

const TOOL_COLORS = {
    BLUE: '#C0DDF0',
    GRAY: '#E0E0E0',
    GREEN: '#C0FFC0',
    ORANGE: '#F0DDC0',
    RED: '#FFC0C0',
    WHITE: '#FFFFFF',
    YELLOW: '#FFFFC0',
}
const TOPOGRAM_NAME = '_topogram'

export default Vue.extend({
    components: {
        RadiologySidebar: () => import('../RadiologySidebar.vue'),
        RadiologyToolbar: () => import('../RadiologyToolbar.vue'),
        DicomImageDisplay: () => import('./DicomImageDisplay.vue'),
        DicomImagePlaceholder: () => import('./DicomImagePlaceholder.vue'),
    },
    props: {
        resources: Array,
        sidebarOpen: Boolean,
    },
    data () {
        return {
            synchronizers: {
                crosshairs: null as unknown,
                referenceLines: null as unknown,
                stackScroll: null as unknown,
                lastUpdatedTopo: null as any,
            },
            // Loaded elements
            topogramElement: null as null | ImageResource,
            gridLayout: null as null | number[],
            elementPositions: [] as number[],
            // Other properties
            ctrlDown: false,
            ctrlRegistered: false,
            mediaContainerSize: [0, 0],
            themeChange: 0,
            wadoImageLoader: null,
            // React to some property changes
            elementsChanged: 0,
        }
    },
    watch: {
        gridLayout: function (value: any, old: any) {
            // If we switch from automatic layout to a set layout, reset element positions
            // and active elements
            if (value && value[0] && value[1] && (!old || !old[0] || !old[1])) {
                this.elementPositions = []
                ;(this.resources as ImageResource[]).forEach((res) => {
                    res.isActive = false
                })
            }
        },
    },
    computed: {
        activeItems (): (ImageResource | ImageStackResource | null)[] {
            this.elementsChanged
            // Array.filter is a pain to make work in TypeScript
            const items = []
            if (this.gridLayout === null || !this.gridLayout[0] || !this.gridLayout[1]) {
                // Now, element display depends on the display mode
                // For simple, automatic arrangement we will display any active images
                for (let i=0; i<this.resources.length; i++) {
                    const resource = this.resources[i] as ImageResource
                    if (resource.isActive) {
                        items.push(resource)
                    }
                    // Make sure we don't exceed predefined grid dimensions
                    if (this.gridLayout && this.gridLayout[0] && this.gridLayout[1]
                        && i === this.gridLayout[0]*this.gridLayout[1]
                    ) {
                        return items
                    }
                }
            } else {
                // For preset grid dimensions, we will have to keep track of image positions
                // within the grid and fill the gaps with empty elements.
                layout_loop:
                for (let i=0; i<this.gridLayout[0]*this.gridLayout[1]; i++) {
                    // If an element is positioned here, show it; else show a placeholder.
                    for (let j=0; j<this.resources.length; j++) {
                        if (this.elementPositions[j] === i) {
                            items.push(this.resources[j] as ImageResource)
                            continue layout_loop
                        }
                    }
                    items.push(null)
                }
            }
            return items
        },
        allResourcesLinked (): boolean {
            this.elementsChanged
            if (!this.resources.length) {
                // Show link icon if there are no elements
                return false
            }
            let someLinkable = false
            const items = this.activeItems
            for (let i=0; i<items.length; i++) {
                if (items[i]?.isStack) {
                    if (!items[i]?.isLinked) {
                        return false
                    } else if (!someLinkable) {
                        // Check that at least some of the active elements can be linked;
                        // show the unlinked icon otherwise
                        someLinkable = true
                    }
                }
            }
            return someLinkable
        },
    },
    methods: {
        addFileAsImage: function (file: File, overrideName?: string) {
            const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file)
            if (imageId) {
                // Check if this image is a topogram
                if (file.name === TOPOGRAM_NAME || overrideName === TOPOGRAM_NAME) {
                    this.topogramElement = new DicomImage(file.name, file.size, imageId)
                } else {
                    (this.resources as ImageResource[]).push(new DicomImage(
                        overrideName ? overrideName : file.name,
                        file.size,
                        imageId
                    ))
                    this.updateElements()
                }
            }
        },
        addFilesAsImageStack: function (files: File[], name: string) {
            if (!files.length) {
                return
            }
            const imgStack = new DicomImageStack(files.length, name || 'Image stack')
            for (let i=0; i<files.length; i++) {
                const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(files[i])
                if (imageId) {
                    imgStack.push(
                        new DicomImage(files[i].name, files[i].size, imageId)
                    )
                }
            }
            // Don't add an empty image stack
            if (imgStack.length) {
                // Add cover image
                (this.resources as ImageStackResource[]).push(imgStack)
            }
            this.updateElements()
        },
        getElementLayoutPosition: function (idx: number): number[][] {
            const activeNum = this.activeItems.length
            const layout = this.gridLayout ? [...this.gridLayout] : [0, 0]
            if (!layout[0] && !layout[1]) {
                // Calculate grid dimensions automatically.
                // Number of colums >= number of rows, i.e. expand columns before rows.
                layout[0] = Math.ceil(Math.sqrt(activeNum))
            } else if (!layout[0]) {
                // Only cols are undefined
                layout[0] = Math.ceil(activeNum/layout[1])
            }
            if (!layout[1]) {
                // Calculate grid rows
                layout[1] = Math.ceil(activeNum/layout[0])
            }
            // Calculate element position within the layout grid
            const colPos = Math.floor(idx/layout[0])
            const rowPos = idx%layout[0]
            return [[rowPos, layout[0]], [colPos, layout[1]]]
        },
        getEmptyLayoutCells: function (): number[] {
            const activeNum = this.activeItems.length
            const layout = this.gridLayout ? [...this.gridLayout] : [0, 0]
            if (!layout[0] && !layout[1]) {
                // Calculate grid dimensions automatically.
                // Number of colums >= number of rows, i.e. expand columns before rows.
                layout[0] = Math.ceil(Math.sqrt(activeNum))
            } else if (!layout[0]) {
                // Only cols are undefined
                layout[0] = Math.ceil(activeNum/layout[1])
            }
            if (!layout[1]) {
                // Calculate grid rows
                layout[1] = Math.ceil(activeNum/layout[0])
            }
            const totalCells = layout[0]*layout[1]
            const indices = []
            for (let i=activeNum; i<totalCells; i++) {
                indices.push(i)
            }
            return indices
        },
        getItemById: function (id: string): ImageResource | ImageStackResource | undefined {
            for (let i=0; i<this.resources.length; i++) {
                const resource = this.resources[i] as ImageResource
                if (resource.id === id) {
                    return resource
                }
            }
            return undefined
        },
        /**
         * Handle a file or directory dropped in the dropzone
         * @param event
         */
        handleFileDrop: async function (event: DragEvent) {
            (this.$root as any).handleFileDrop(event)
            return
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
                            } else if (rootDir.directories[i].files?.length === 1) {
                                // Single file directory as single image
                                const overrideName = rootDir.directories[i].name === TOPOGRAM_NAME ? TOPOGRAM_NAME : undefined
                                this.addFileAsImage((rootDir.directories[i].files as FileSystemItem[])[0].file as File, overrideName)
                            } else {
                                // Add several files in a directory as a separate image stack
                                this.addFilesAsImageStack(
                                    (rootDir.directories[i].files || []).map(f => f.file as File),
                                    rootDir.directories[i].name
                                )
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
        isElementActive: function (id: string): boolean {
            const items = this.activeItems
            for (let i=0; i<items.length; i++) {
                if (items[i]?.id === id) {
                    return true
                }
            }
            return false
        },
        isElementLinked: function (id: string): boolean {
            const items = this.activeItems
            for (let i=0; i<items.length; i++) {
                if (items[i] && items[i]?.id === id) {
                    // @ts-ignore: TSLint doesn't understand that items[i] cannot be null
                    return items[i].isStack ? items[i].isLinked : false
                }
            }
            return false
        },
        itemDropped: function (props: any) {
            this.elementPositions[props.item] = props.target
            this.elementsChanged++
        },
        linkAllResources: function (value: boolean) {
            for (let i=0; i<this.resources.length; i++) {
                const resource = this.resources[i] as ImageResource
                if (resource.isActive && resource.isStack
                    && resource.isLinked !== value
                ) {
                    if (value) {
                        (this.resources[i] as ImageStackResource)
                        .link(this.$store.state.linkedScrollPosition)
                    } else {
                        (this.resources[i] as ImageStackResource).unlink()
                    }
                }
            }
        },
        mediaResized: function () {
            // Check that the element still exists (this method is also fired when the component is destroyed)
            const mediaEl = this.$refs['media'] as HTMLElement
            if (!mediaEl) {
                return
            }
            // Deduct padding and borders from element dimensions
            this.mediaContainerSize = [
                mediaEl.offsetWidth - 2,
                mediaEl.offsetHeight - 2
            ]
        },
        removeDICOMResource: function (id: string) {
            for (let i=0; i<this.resources.length; i++) {
                const resource = this.resources[i] as ImageResource
                if (resource.id === id) {
                    resource.removeFromCache()
                    this.resources.splice(i, 1)
                    this.updateElements()
                }
            }
        },
        setGridLayout: function (layout: number[] | null) {
            this.gridLayout = layout
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
        /**
         * Force a reactive update on the element list.
         */
        updateElements: function () {
            this.elementsChanged++
        },
    },
    mounted () {
        // Set up Cornerstone Tools
        cornerstoneTools.external.cornerstone = cornerstone
        cornerstoneTools.external.cornerstoneMath = cornerstoneMath
        cornerstoneTools.external.Hammer = Hammer
        cornerstoneTools.init()
        // Set a more neutral tool color
        // TODO: Allow selecting the tool color?
        cornerstoneTools.toolColors.setToolColor(TOOL_COLORS.YELLOW)
        cornerstoneTools.toolColors.setActiveColor(TOOL_COLORS.YELLOW)
        localStorage.setItem("debug", "cornerstoneTools")
        // Set up WADO Image Loader
        cornerstoneWADOImageLoader.external.cornerstone = cornerstone
        cornerstoneWADOImageLoader.external.dicomParser = dicomParser
        // Reference lines synchronizer
        this.synchronizers.crosshairs = new cornerstoneTools.Synchronizer(
            'cornerstonenewimage',
            (synchronizer: any, source: any, target: any, event: any) => {
                if (source === target) {
                    return
                }
                // Get the item id from element id
                const srcId = source.id.split('-')
                const tgtId = target.id.split('-')
                // Only synchronize linked elements
                if (!this.isElementLinked(srcId[1]) || !this.isElementLinked(tgtId[1])) {
                    // Source or target is not linked, or they are the same element
                    // This doesn't work at the moment, because an update is triggered via the reference line synchronizer
                    return
                }
                cornerstoneTools.updateImageSynchronizer(synchronizer, source, target, event)
            }
        )
        // Reference lines synchronizer
        this.synchronizers.referenceLines = new cornerstoneTools.Synchronizer(
            'cornerstonenewimage',
            (synchronizer: any, source: any, target: any, event: any) => {
                if (source === target) {
                    return
                }
                // Right now there seems to be now way to prevent the reference lines from any synchronized
                // elements from showing up
                // const srcId = source.id.split('-')
                const tgtId = target.id.split('-')
                // Only pass update events to topogram elements
                if (tgtId[0] !== 'topogram') {
                    return
                }
                cornerstoneTools.updateImageSynchronizer(synchronizer, source, target, event)
            }
        )
        // Stack scroll synchronizer
        this.synchronizers.stackScroll = new cornerstoneTools.Synchronizer(
            'cornerstonetoolsstackscroll',
            (synchronizer: any, source: any, target: any, event: any) => {
                if (source === target) {
                    return
                }
                // Get the item id from element id
                const srcId = source.id.split('-')
                const tgtId = target.id.split('-')
                let srcEl, tgtEl = null
                for (let i=0; i<this.resources.length; i++) {
                    const resource = this.resources[i] as ImageResource
                    if (resource.id === srcId[1]) {
                        srcEl = this.resources[i]
                    } else if (resource.id === tgtId[1]) {
                        tgtEl = this.resources[i]
                    }
                }
                // Make sure that this is an actual active element and an actual scroll event
                if (srcEl === null || !this.isElementActive(srcId[1]) || !event) {
                    return
                }
                // Synchronize stack position
                srcEl = (srcEl as DicomImageStack)
                srcEl.currentPosition = event.newImageIdIndex
                // Check if control key is down (force scroll)
                if (this.ctrlDown) {
                    const relPos = (srcEl.currentPosition - (srcEl.linkedPosition || 0))/srcEl.images.length
                            + (srcEl.masterLinkPosition || 0)
                    this.$store.commit('set-linked-scroll-position', { origin: srcId[1], position: relPos })
                    return
                }
                // Determine if target element should be synchronized with source element
                if (!this.isElementLinked(srcId[1]) || !this.isElementLinked(tgtId[1])) {
                    // Source or target is not linked
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
                const items = this.activeItems
                for (let i=0; i<items.length; i++) {
                    if (items[i] && items[i]?.isStack && items[i]?.isLinked) {
                        (items[i] as ImageStackResource).link(this.$store.state.linkedScrollPosition)
                    }
                }
                this.ctrlDown = true
                this.ctrlRegistered = true // Prevent event from registering repeatedly
            }
        })
        // Listen to root emits
        this.$root.$on('remove-dicom-resource', this.removeDICOMResource)
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
.medigi-viewer-dicom-image-interface {
    position: absolute;
    top: 0px;
    left: 0px;
    right: 0px;
    bottom: 0px;
    display: grid;
    grid-template-columns: [left-edge] 300px [divider] auto [right-edge];
    grid-template-rows: [top-edge] 80px [divider] auto [bottom-edge];
    color: var(--medigi-viewer-text-main);
    background-color: var(--medigi-viewer-background);
    font-family: sans-serif;
    overflow: auto;
    transition: left 0.5s;
}
    .medigi-viewer-dicom-image-interface.medigi-viewer-sidebar-closed {
        left: -240px;
    }
    .medigi-viewer-dicom-image-interface > .medigi-viewer-sidebar {
        grid-column-start: left-edge;
        grid-column-end: divider;
        grid-row-start: top-edge;
        grid-row-end: bottom-edge;
        overflow: auto;
    }
    .medigi-viewer-dicom-image-interface > .medigi-viewer-toolbar {
        grid-column-start: divider;
        grid-row-start: top-edge;
        grid-row-end: divider;
    }
    .medigi-viewer-dicom-image-interface > .medigi-viewer-media {
        grid-column-start: divider;
        grid-row-start: divider;
        margin: 0 10px 10px 0;
        border: 1px solid var(--medigi-viewer-border-faint);
        overflow: hidden; /* Without this DICOM elements do not scale down */
    }
</style>
