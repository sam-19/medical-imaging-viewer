<template>
    <div class="medigi-viewer-media-icon">
        <!-- DICOM image -->
        <div v-if="cover" ref="cover-image" class="medigi-viewer-cover-image"></div>
        <!-- Single image -->
        <div v-else-if="type==='image'" class="medigi-viewer-icon-image-single">
            <span :style="getLabelFontSize()">{{ $t(label) }}</span>
        </div>
        <!-- Image stack -->
        <div v-else-if="type==='image-stack'" class="medigi-viewer-icon-image-stack">
            <div></div>
            <div></div>
            <div></div>
            <span :style="getLabelFontSize()">{{ $t(label) }}</span>
        </div>
        <!-- Single biosignal -->
        <div v-else-if="type==='biosignal' && count===1" class="medigi-viewer-icon-biosignal-single">
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
        cover: String,
        count: Number,
        label: String,
    },
    methods: {
        /**
         * Display the image from cover image URL
         */
        displayCoverImage: function () {
            const coverEl = this.$refs['cover-image'] as HTMLDivElement
            if (coverEl) {
                this.$root.cornerstone.enable(coverEl)
                this.$root.cornerstone.loadAndCacheImage(this.cover).then((image: any) => {
                    const viewport = this.$root.cornerstone.getDefaultViewportForImage(coverEl, image)
                    this.$root.cornerstone.displayImage(coverEl, image, viewport)
                    this.$store.commit('SET_CACHE_STATUS', this.$root.cornerstone.imageCache.getCacheInfo())
                }).catch((error: Error) => {
                    // TODO: Handle error
                })
            }
        },
        /**
         * Accommodate font size if label is long
         */
        getLabelFontSize: function (): string {
            let baseSize = 14
            if (this.label && this.label.length > 3) {
                baseSize -= (this.label.length-3)*2
            }
            return 'font-size:' + baseSize.toString() + 'px'
        }
    },
    mounted () {
        // Attempt to load the cover image
        if (this.cover) {
            this.displayCoverImage()
        }
    }
})

</script>

<style scoped>
.medigi-viewer-media-icon {
    height: 100%;
    width: 100%;
    padding: 10% 20% 20% 10%;
}
    .medigi-viewer-icon-image-single {
        position: relative;
        height: 100%;
        width: 100%;
        border: solid 1px var(--medigi-viewer-text-main);
        border-radius: 5%;
    }
    .medigi-viewer-icon-image-stack {
        position: relative;
        height: 100%;
        width: 100%;
    }
    .medigi-viewer-icon-image-stack > div {
        position: absolute;
        height: 80%;
        width: 80%;
        border: solid 1px var(--medigi-viewer-text-main);
        background-color: var(--medigi-viewer-background);
        border-radius: 5%;
    }
    .medigi-viewer-icon-image-stack > div:nth-child(1) {
        top: 0;
        left: 0;
    }
    .medigi-viewer-icon-image-stack > div:nth-child(2) {
        top: 10%;
        left: 10%;
    }
    .medigi-viewer-icon-image-stack > div:nth-child(3) {
        top: 20%;
        left: 20%;
    }
    .medigi-viewer-media-icon span {
        position: absolute;
        bottom: -20%;
        right: -10%;
        padding: 3px;
        background-color: var(--medigi-viewer-background);
    }

</style>
