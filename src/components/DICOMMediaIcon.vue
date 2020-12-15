<template>
    <div class="dicom-viewer-media-icon">
        <!-- Single image -->
        <div v-if="type==='image' && count===1" class="dicom-viewer-icon-image-single">
            <span :style="getLabelFontSize()">{{ $t(label) }}</span>
        </div>
        <!-- Image stack -->
        <div v-else-if="type==='image' && count>1" class="dicom-viewer-icon-image-stack">
            <div></div>
            <div></div>
            <div></div>
            <span :style="getLabelFontSize()">{{ $t(label) }}</span>
        </div>
        <!-- Single biosignal -->
        <div v-if="type==='biosignal' && count===1" class="dicom-viewer-icon-biosignal-single">
            <span :style="getLabelFontSize()">{{ $t(label) }}</span>
        </div>
    </div>
</template>

<script lang="ts">

import Vue from 'vue'
import { ImageModality, BiosignalModality } from '../types/viewer'

export default Vue.extend({
    components: {
    },
    props: {
        type: String,
        count: Number,
        label: String,
    },
    methods: {
        /**
         * Accommodate font size if label is long
         */
        getLabelFontSize: function (): string {
            let baseSize = 14
            if (this.label.length > 3) {
                baseSize -= (this.label.length-3)*2
            }
            return 'font-size:' + baseSize.toString() + 'px'
        }
    }
})

</script>

<style>

</style>
