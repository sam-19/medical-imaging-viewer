<template>
    <div class="medimg-viewer-media-icon">
        <div class="medimg-viewer-default-icon">
            <div class="medimg-viewer-icon-biosignal">
                <span :style="getLabelFontSize()">{{ t(label) }}</span>
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
        label: String,
        type: String,
    },
    methods: {
        /** Shorthand for component-specific translations */
        t: function (str: string, args?: any) {
            if (args) {
                return this.$t(`components.EKG.EkgSidebarIcon.${str}`, args)
            } else {
                return (this.$t('components.EKG.EkgSidebarIcon') as any)[str]
            }
        },
        /**
         * Display the image from cover image URL
         */
        displayCoverImage: function () {
            const coverEl = this.$refs['cover-image'] as HTMLDivElement

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
    .medimg-viewer-media-icon span {
        position: absolute;
        bottom: -20%;
        right: -10%;
        padding: 3px;
    }

</style>
