<template>
    <div :id="`${$store.state.appName}-medigi-viewer-ekg-interface`"
        :class="[
            'medigi-viewer-dicom-waveform-interface',
            { 'medigi-viewer-sidebar-closed': !sidebarOpen },
        ]"
    >
        <div class="medigi-viewer-toolbar">
            <ekg-toolbar
                :allLinked="allResourcesLinked"
                v-on:link-all-resources="linkAllResources"
            />
        </div>
        <div class="medigi-viewer-sidebar">
            <ekg-sidebar
                :items="ekgResources"
                v-on:element-status-changed="updateElements"
                v-on:file-dropped="handleFileDrop"
            />
        </div>
        <div ref="media" class="medigi-viewer-media">
            <div class="medigi-viewer-waveforms">
                <dicom-waveform-display v-if="activeItem"
                    ref="waveform-element"
                    :containerSize="mediaContainerSize"
                    :resource="activeItem"
                />
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import ResizeObserver from 'resize-observer-polyfill'
import { SignalResource } from '../../../types/assets'
import DicomWaveform from '../../../assets/dicom/DicomWaveform'

export default Vue.extend({
    components: {
        EkgSidebar: () => import('../EkgSidebar.vue'),
        EkgToolbar: () => import('../EkgToolbar.vue'),
        DicomWaveformDisplay: () => import('./DicomWaveformDisplay.vue'),
    },
    props: {
        ekgResources: Array,
        sidebarOpen: Boolean,
    },
    data () {
        return {
            activeItem: null as null | DicomWaveform,
            allResourcesLinked: false,
            mediaContainerSize: [0, 0],
        }
    },
    watch: {
        ekgResources (value: any, old: any) {
            console.log(this.ekgResources)
            if (this.ekgResources.length) {
                this.activeItem = this.ekgResources[0] as DicomWaveform
            }
        },
    },
    methods: {
        linkAllResources: function (value: boolean) {

        },
        handleFileDrop: async function (event: DragEvent) {

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
        updateElements: function () {

        },
    },
    mounted () {
        // Set up resize observer for the media container
        new ResizeObserver(this.mediaResized).observe((this.$refs['media'] as Element))
        this.activeItem = this.ekgResources[0] as DicomWaveform
    },
})
</script>

<style>
.medigi-viewer-dicom-waveform-interface {
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
    .medigi-viewer-dicom-waveform-interface.medigi-viewer-sidebar-closed {
        left: -240px;
    }
    .medigi-viewer-dicom-waveform-interface > .medigi-viewer-sidebar {
        grid-column-start: left-edge;
        grid-column-end: divider;
        grid-row-start: top-edge;
        grid-row-end: bottom-edge;
        overflow: auto;
    }
    .medigi-viewer-dicom-waveform-interface > .medigi-viewer-toolbar {
        grid-column-start: divider;
        grid-row-start: top-edge;
        grid-row-end: divider;
    }
    .medigi-viewer-dicom-waveform-interface > .medigi-viewer-media {
        grid-column-start: divider;
        grid-row-start: divider;
        margin: 0 10px 10px 0;
        border: 1px solid var(--medigi-viewer-border-faint);
        overflow: hidden; /* Without this DICOM elements do not scale down */
    }
</style>
