<template>

    <div :id="`${appName}-medigi-viewer`" class="medigi-viewer medigi-viewer-dark-mode">
        <div class="medigi-viewer-toolbar">
            <ViewerToolbar></ViewerToolbar>
        </div>
        <div class="medigi-viewer-sidebar">
            <ViewerSidebar></ViewerSidebar>
        </div>
        <div ref="media" class="medigi-viewer-media">
            <div v-if="!dcmElements.length" :id="`${appName}-medigi-viewer-dropzone`" class="medigi-viewer-dropzone"></div>
            <div v-else class="medigi-viewer-images">
                <DICOMImageDisplay v-for="(resource, idx) in dcmElements"
                    :key="`${appName}-medigi-viewer-element-${idx}`"
                    :containerSize="mediaContainerSize"
                    :listPosition="[idx, dcmElements.length]"
                    :resource="resource"
                    ref="images"
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
            dcmElements: [] as ImageResource[] | ImageStackResource[],
            mediaContainerSize: [0, 0],
            wadoImageLoader: null,
        }
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
                    // Next, check if this is a single file dir
                    if (rootDir.directories && !rootDir.directories.length &&
                        rootDir.files && rootDir.files.length
                    ) {
                        // Add all loaded images as an image stack
                        const imgStack = new DICOMImageStack(rootDir.files.length, 'Image stack')
                        for (let j=0; j<rootDir.files.length; j++) {
                            const file = rootDir.files[j].file as File
                            const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file)
                            if (imageId) {
                                imgStack.push(
                                    new DICOMImage(file.name, file.size, imageId)
                                )
                            }
                        }
                        (this.dcmElements as ImageStackResource[]).push(imgStack)
                    }
                }
            })
            /*
            // Helper functions to recover the files asynchronously
            interface fileDir { name: string, items: File[] }
            // This method recurses only one level of directories!
            let readAllItems = async (items: DataTransferItemList): Promise<File[] | fileDir[]> => {
                let fileTree = [] as File[] | fileDir[]
                // At least Chrome may not return the entire list at once (max 100 entires)
                // so we need to cache returned items in a separate list
                let cache = []
                // Initial cache
                for (let i=0; i<items.length; i++) {
                    cache.push(items[i].webkitGetAsEntry())
                }
                // Go through the queue until it is empty
                while (cache.length > 0) {
                    let item = cache.shift()
                    if (item.isFile) {
                        // Add files to root directory
                        fileTree.push(await new Promise((resolve, reject) => item.file(resolve, reject)))
                    } else if (item.isDirectory) {
                        // New directory encountered
                        let dirReader = item.createReader()
                        cache.push(await readDirectoryItems(item.name, dirReader))
                    } else {
                        fileTree.push(item)
                    }
                }
                return fileTree
            }
            let readDirectoryItems = async (name: string, reader: any) => {
                let dir = { name: name, items: [] as any[] }
                let items = await readItems(reader) // Get first batch of items
                if (Array.isArray(items)) {
                    while (items.length > 0) {
                        let file = await new Promise((resolve, reject) => items.shift().file(resolve, reject))
                        dir.items.push(file)
                        items = items.concat(await readItems(reader))
                    }
                }
                return dir
            }
            let readItems = async (reader: any): Promise<any> => {
                try {
                    return await new Promise((resolve, reject) => {
                        reader.readEntries(resolve, reject)
                    })
                } catch (error) {
                    console.error(error)
                }
            }
            event.stopPropagation()
            event.preventDefault()
            // Get FileList from the droppped object
            if (event.dataTransfer && event.dataTransfer.items) {
                let fileTree = await readAllItems(event.dataTransfer.items)
                if (fileTree.length === 1 && !fileTree[0].hasOwnProperty('items')) {
                    let file = fileTree[0] as File
                    // Display single image
                    if (file) {
                        const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file)
                        if (imageId) {
                            this.dcmElements = [{
                                name: 'Image stack', modality: 'UNKNOWN', images: [
                                  { url: imageId,size: file.size,name: file.name } as ImageResource
                                ]
                              } as unknown as ImageStackResource]
                        }
                    }
                } else {
                    for (let i=0; i<fileTree.length; i++) {
                        if (fileTree[i].hasOwnProperty('items')) {
                            // Add all loaded images as an image stack
                            const imgStack = new DICOMImageStack((fileTree[i] as fileDir).items.length, 'Image stack')
                            for (let j=0; j<(fileTree[i] as fileDir).items.length; j++) {
                                let file = (fileTree[i] as fileDir).items[j] as File
                                const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file)
                                if (imageId) {
                                    imgStack.push(
                                        new DICOMImage(file.name, file.size, imageId)
                                    )
                                }
                            }
                            (this.dcmElements as ImageStackResource[]).push(imgStack)
                        }
                    }
                }
            } else if (event.dataTransfer && event.dataTransfer.files) {
                for (let i=0; i<event.dataTransfer.files.length; i++) {
                    if (event.dataTransfer.files[i].size) {
                        break // TODO: Handle multiple files and folders?
                    }
                }
            }
            */
        },
        mediaResized: function () {
            this.mediaContainerSize = [
                (this.$refs['media'] as HTMLElement).offsetWidth,
                (this.$refs['media'] as HTMLElement).offsetHeight
            ]
        },
    },
    mounted () {
        // Set up WADO Image Loader
        cornerstoneWADOImageLoader.external.cornerstone = this.cornerstone
        cornerstoneWADOImageLoader.external.dicomParser = dicomParser
        // Set up DICOM file dropzone
        const dropZone = document.getElementById(`${this.appName}-medigi-viewer-dropzone`)
        if (dropZone) {
            dropZone.addEventListener('dragover', this.handleFileDrag, false)
            dropZone.addEventListener('drop', this.handleFileDrop, false)
        }
        // Set up resize observer for the media container
        new ResizeObserver(this.mediaResized).observe((this.$refs['media'] as Element))
    },
})

</script>

<style>
/* Global app styles */
.medigi-viewer-dark-mode, .medigi-viewer-dark-mode * {
    --medigi-viewer-background: #000000;
    --medigi-viewer-background-highlight: #202020;
    --medigi-viewer-border: #C0C0C0;
    --medigi-viewer-border-highlight: #F0F0F0;
    --medigi-viewer-text-main: #E0E0E0;
    --medigi-viewer-text-minor: #C0C0C0;
    --medigi-viewer-text-faint: #808080;
}
.medigi-viewer-light-mode, .medigi-viewer-light-mode * {
    --medigi-viewer-background: #FFFFFF;
    --medigi-viewer-background-highlight: #D0D0D0;
    --medigi-viewer-border: #303030;
    --medigi-viewer-border-highlight: #101010;
    --medigi-viewer-text-main: #000000;
    --medigi-viewer-text-minor: #303030;
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
        position: relative;
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
