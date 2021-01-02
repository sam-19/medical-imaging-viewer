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
                <DICOMImage v-for="(resource, idx) in dcmElements"
                    :key="`${appName}-medigi-viewer-element-${idx}`"
                    :containerSize="mediaContainerSize"
                    :listPosition="[idx, dcmElements.length]"
                    :resource="resource"
                    ref="images"
                >
                </DICOMImage>
            </div>
        </div>
    </div>

</template>

<script lang="ts">

import Vue from 'vue'
import cornerstone from 'cornerstone-core'
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader'
import dicomParser from 'dicom-parser'
import ResizeObserver from 'resize-observer-polyfill'
import { DICOMResource }from '../types/viewer'

export default Vue.extend({
    components: {
        DICOMImage: () => import('./DICOMImage.vue'),
        ViewerSidebar: () => import('./AppSidebar.vue'),
        ViewerToolbar: () => import('./AppToolbar.vue'),
    },
    props: {
        appName: String,
    },
    data () {
        return {
            cornerstone: cornerstone,
            dcmElements: [] as DICOMResource[],
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

        handleFileDrop: function (event: DragEvent) {
            console.log(event)
            event.stopPropagation()
            event.preventDefault()
            // Get FileList from the droppped object
            let selectedFile
            if (event.dataTransfer && event.dataTransfer.items) {
                for (let i=0; i<event.dataTransfer.items.length; i++) {
                    if (event.dataTransfer.items[i].kind === 'file') {
                        let file = event.dataTransfer.items[i].getAsFile()
                        if (file && file.size) {
                            selectedFile = file
                            break // TODO: Handle multiple files and folders
                        }
                    }
                }
            } else if (event.dataTransfer && event.dataTransfer.files) {
                for (let i=0; i<event.dataTransfer.files.length; i++) {
                    if (event.dataTransfer.files[i].size) {
                        selectedFile = event.dataTransfer.files[i]
                        break // TODO: Handle multiple files and folders
                    }
                }
            }
            console.log(selectedFile)
            if (selectedFile) {
                const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(selectedFile)
                if (imageId) {
                    let dcmEl = { url: imageId, size: selectedFile.size, name: selectedFile.name } as DICOMResource
                    this.dcmElements.push(dcmEl)
                    console.log(this.dcmElements)
                }
            }
        },
        mediaResized: function () {
            this.mediaContainerSize = [(this.$refs['media'] as HTMLElement).offsetWidth, (this.$refs['media'] as HTMLElement).offsetHeight]
        }
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
}
.medigi-viewer-light-mode, .medigi-viewer-light-mode * {
    --medigi-viewer-background: #FFFFFF;
    --medigi-viewer-background-highlight: #D0D0D0;
    --medigi-viewer-border: #303030;
    --medigi-viewer-border-highlight: #101010;
    --medigi-viewer-text-main: #000000;
    --medigi-viewer-text-minor: #303030;
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
