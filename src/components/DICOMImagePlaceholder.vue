<template>

    <div ref="wrapper" class="medigi-viewer-image-placeholder">
        <div ref="content"></div>
    </div>

</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
    components: {
    },
    props: {
        containerSize: Array, // The size of the entire image media container as [width, height]
        layoutPosition: Array, // Element position in layout grid [[colPos, cols], [rowPos, rows]]
    },
    watch: {
        containerSize (value: Array<number>, old: Array<number>) {
            this.resizeContainer(value)
        },
        layoutPosition (value: Array<number>, old: Array<number>) {
            this.resizeContainer()
        },
    },
    methods: {
        /**
         * Resize the displayed image into given dimensions.
         * @param {number[]} dimensions [width, height].
         */
        resizeContainer: function (dimensions?: number[]) {
            dimensions = dimensions || this.containerSize as number[]
            const colPos = this.layoutPosition[0] as number[]
            const rowPos = this.layoutPosition[1] as number[]
            const isRowFirst = (colPos[0] === 0)
            const isColLast = (rowPos[0] === rowPos[1] - 1)
            // Remove 20 px for padding
            let hPad = isRowFirst ? 20 : 21
            let vPad = isColLast ? 20 : 21
            ;(this.$refs['content'] as HTMLElement).style.width = `${dimensions[0]/colPos[1] - hPad}px`
            ;(this.$refs['content'] as HTMLElement).style.height = `${dimensions[1]/rowPos[1] - vPad}px`
            ;(this.$refs['wrapper'] as HTMLElement).style.borderLeft
                = isRowFirst ? 'none' : '1px solid var(--medigi-viewer-border-faint)'
            ;(this.$refs['wrapper'] as HTMLElement).style.borderBottom
                = isColLast ? 'none' : '1px solid var(--medigi-viewer-border-faint)'
        },
    },
    mounted () {
        console.log(this.layoutPosition)
        this.resizeContainer()
    }
})

</script>

<style scoped>
.medigi-viewer-image-placeholder {
    position: relative;
    float: left;
    padding: 10px;
}
</style>
