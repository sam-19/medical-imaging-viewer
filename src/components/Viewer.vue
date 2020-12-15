<template>

    <div :id="`${appName}-dicom-viewer`" class="dicom-viewer dicom-viewer-dark-mode">
        <div class="dicom-viewer-toolbar">
            <ViewerToolbar></ViewerToolbar>
        </div>
        <div class="dicom-viewer-sidebar">
            <ViewerSidebar></ViewerSidebar>
        </div>
        <div class="dicom-viewer-media">
            <DICOMElement v-for="(element, idx) in dcElements" :key="`${appName}-dicom-viewer-element-${idx}`"
                :dataUrl="element.dataUrl"
            >
            </DICOMElement>
        </div>
    </div>

</template>

<script lang="ts">

import Vue from 'vue'
import { DICOMElement }from '../types/viewer'

export default Vue.extend({
    components: {
        Fullscreen: () => import('vue-fullscreen/src/component.vue'),
        DICOMElement: () => import('./DICOMElement.vue'),
        ViewerSidebar: () => import('./ViewerSidebar.vue'),
        ViewerToolbar: () => import('./ViewerToolbar.vue'),
    },
    props: {
        appName: String,
    },
    data () {
        return {
            dcElements: [] as DICOMElement[],
        }
    }
})

</script>

<style scoped>

</style>
