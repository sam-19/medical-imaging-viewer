<template>

    <div ref="container">

    </div>

</template>

<script lang="ts">
import Vue from 'vue'
import { DICOMResource } from '../types/viewer'

export default Vue.extend({
    components: {
    },
    props: {
        containerSize: Array, // The size of the entire image media container as [width, height]
        listPosition: Array, // Position of this image in the image list as [index, list length]
        resource: Object, // DICOMResource
    },
    watch: {
        containerSize (value: Array<number>, old: Array<number>) {
            if (this.listPosition[1] === 1) {
                // Only one item in the list, we can take up the whole space
                let container = this.$refs['container'] as HTMLDivElement
                container.style.width = `${value[0]}px`
                container.style.height = `${value[1]}px`
                this.$root.cornerstone.resize(container)
            }
        },
        listPosition (value: Array<number>, old: Array<number>) {
            // TODO: Update display
        },
    },
    mounted () {
        const dicomEl = this.$refs['container'] as HTMLDivElement
        if (dicomEl) {
            this.$root.cornerstone.enable(dicomEl)
            this.$root.cornerstone.loadImage(this.resource.url).then((image: any) => {
                const viewport = this.$root.cornerstone.getDefaultViewportForImage(dicomEl, image)
                if (viewport) {
                    this.$root.cornerstone.displayImage(dicomEl, image, viewport)
                }
            }, (error: Error) => {
                alert(error)
            })
        }
    }
})

</script>

<style scoped>

</style>
