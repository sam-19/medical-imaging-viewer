<template>
    <div class="medimg-viewer-media-icon">
        <!-- DICOM image -->
        <div v-if="cover" ref="cover-image" class="medimg-viewer-cover-image"></div>
        <!-- Single image -->
        <div v-else class="medimg-viewer-default-icon">
            <div v-if="type==='image'" class="medimg-viewer-icon-image-single">
                <span :style="getLabelFontSize()">{{ label }}</span>
            </div>
            <!-- Image stack -->
            <div v-else-if="stack" class="medimg-viewer-icon-image-stack">
                <div></div>
                <div></div>
                <div></div>
                <span :style="getLabelFontSize()">{{ label }}</span>
            </div>
        </div>
    </div>
</template>

<script lang="ts">

import Vue from 'vue'
import * as cornerstone from 'cornerstone-core'

export default Vue.extend({
    components: {
    },
    props: {
        count: Number,
        cover: Object,
        label: String,
        stack: Boolean,
        type: String,
    },
    watch: {
        cover: function (value: string, old: string) {
            if (value === 'LOADING') {

            } else {
                this.displayCoverImage()
            }
        },
    },
    methods: {
        /** Shorthand for component-specific translations */
        t: function (str: string, args?: any) {
            if (args) {
                return this.$t(`components.Radiology.Dicom.DicomImageIcon.${str}`, args)
            } else {
                return (this.$t('components.Radiology.Dicom.DicomImageIcon') as any)[str]
            }
        },
        /**
         * Display the image from cover image URL
         */
        displayCoverImage: function () {
            const coverEl = this.$refs['cover-image'] as HTMLDivElement
            if (coverEl) {
                cornerstone.enable(coverEl)
                cornerstone.loadAndCacheImage(this.cover.url).then((image: any) => {
                    const viewport = cornerstone.getDefaultViewportForImage(coverEl, image)
                    cornerstone.displayImage(coverEl, image, viewport)
                    cornerstone.resize(coverEl)
                    this.$store.commit('set-cache-status', cornerstone.imageCache.getCacheInfo())
                }).catch((response: any) => {
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
        if (this.cover) {
            if (this.cover === 'LOADING') {

            } else {
                this.displayCoverImage()
            }
        }
    }
})

</script>

<style scoped>

.medimg-viewer-cover-image {
    /* Initial dimensions */
    height: 75px;
    width: 75px;
}
.medimg-viewer-default-icon {
    width: 75px; /* Initial width */
    height: 75px;
    padding: 10% 20% 20% 10%; /* Apply margins to all the default icons */
}
    .medimg-viewer-icon-image-single {
        position: relative;
        height: 100%;
        width: 100%;
        border: solid 1px var(--medimg-viewer-text-main);
        border-radius: 5%;
    }
    .medimg-viewer-icon-image-stack {
        position: relative;
        height: 100%;
        width: 100%;
    }
    .medimg-viewer-icon-image-stack > div {
        position: absolute;
        height: 80%;
        width: 80%;
        border: solid 1px var(--medimg-viewer-text-main);
        background-color: var(--medimg-viewer-background);
        border-radius: 5%;
    }
    .medimg-viewer-icon-image-stack > div:nth-child(1) {
        top: 0;
        left: 0;
    }
    .medimg-viewer-icon-image-stack > div:nth-child(2) {
        top: 10%;
        left: 10%;
    }
    .medimg-viewer-icon-image-stack > div:nth-child(3) {
        top: 20%;
        left: 20%;
    }
    .medimg-viewer-media-icon span {
        position: absolute;
        bottom: -20%;
        right: -10%;
        padding: 3px;
        background-color: var(--medimg-viewer-background);
    }

</style>
