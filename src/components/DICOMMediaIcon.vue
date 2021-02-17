<template>
    <div class="medigi-viewer-media-icon">
        <!-- DICOM image -->
        <div v-if="cover" ref="cover-image" class="medigi-viewer-cover-image"></div>
        <!-- Single image -->
        <div v-else class="medigi-viewer-default-icon">
            <div v-if="type==='image'" class="medigi-viewer-icon-image-single">
                <span :style="getLabelFontSize()">{{ $t(label) }}</span>
            </div>
            <!-- Image stack -->
            <div v-else-if="stack" class="medigi-viewer-icon-image-stack">
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
    </div>
</template>

<script lang="ts">

import Vue from 'vue'
import cornerstone from 'cornerstone-core'

export default Vue.extend({
    components: {
    },
    props: {
        count: Number,
        cover: String,
        label: String,
        stack: Boolean,
        type: String,
    },
    methods: {
        /**
         * Display the image from cover image URL
         */
        displayCoverImage: function () {
            const coverEl = this.$refs['cover-image'] as HTMLDivElement
            if (coverEl) {
                cornerstone.enable(coverEl)
                cornerstone.loadAndCacheImage(this.cover).then((image: any) => {
                    console.log(image.data)
                    // Get image dimensions and set the cover image dimensions to preserve the aspec ratio
                    /*
                    const maxDim = [150, 125] // Max width and height
                    if (image.width && image.height) { // I don't think this is even needed but better safe than sorry
                        const ar = image.width/image.height
                        // Container height is our limiting factor
                        coverEl.style.height = `${maxDim[1]}px`
                        if (ar*maxDim[1] < maxDim[0]) {
                            coverEl.style.width = `${Math.round(ar*maxDim[1])}px`
                        } else {
                            coverEl.style.width = `${maxDim[0]}px`
                        }
                        cornerstone.resize(coverEl)
                    }*/
                    const viewport = cornerstone.getDefaultViewportForImage(coverEl, image)
                    cornerstone.displayImage(coverEl, image, viewport)
                    cornerstone.resize(coverEl)
                    this.$store.commit('set-cache-status', cornerstone.imageCache.getCacheInfo())
                }).catch((response: any) => {
                    if (response.dataSet && response.dataSet.elements && response.dataSet.elements.x54000100) {
                        // Waveform sequence
                        import('../assets/dicom/DICOMWaveform').then(DICOMWaveform => {
                            const waveform = new DICOMWaveform.default('Waveform', response.dataSet.elements)

                        })
                    } else {
                        this.$emit('loading-cover-failed')
                    }
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

.medigi-viewer-cover-image {
    /* Initial dimensions */
    height: 125px;
    width: 125px;
}
.medigi-viewer-default-icon {
    width: 125px; /* Initial width */
    height: 125px;
    padding: 10% 20% 20% 10%; /* Apply margins to all the default icons */
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
