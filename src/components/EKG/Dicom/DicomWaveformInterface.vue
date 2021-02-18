<template>
    <div :id="`${$store.state.appName}-medigi-dicom-waveform-interface`"
        :class="[
            'medigi-viewer-dicom-waveform-interface',
            { 'medigi-viewer-sidebar-closed': !sidebarOpen },
        ]"
    >
        <div class="medigi-viewer-toolbar">
            <biosignals-toolbar
                :allLinked="allResourcesLinked"
                :gridLayout.sync="gridLayout"
                :synchronizers="synchronizers"
                v-on:link-all-resources="linkAllResources"
            />
        </div>
        <div class="medigi-viewer-sidebar">
            <biosignals-sidebar
                :items="dicomElements"
                v-on:element-status-changed="updateElements"
                v-on:file-dropped="handleFileDrop"
            />
        </div>
        <div ref="media" class="medigi-viewer-media">
            <div class="medigi-viewer-images">
                <dicom-waveform-display v-if="activeItem"
                    ref="dicom-element"
                    :containerSize="mediaContainerSize"
                    :resource="activeItem"
                />
            </div>
        </div>
    </div>
</template>

<script>
import { SignalResource } from '../../../types/assets'
import DicomWaveform from '../../../assets/dicom/DicomWaveform'

export default {

}
</script>

<style>

</style>
