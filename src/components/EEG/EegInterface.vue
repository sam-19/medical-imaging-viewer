<template>
    <div :id="`${$store.state.appName}-medigi-viewer-eeg-interface`"
        :class="[
            'medigi-viewer-eeg-interface',
            { 'medigi-viewer-sidebar-closed': !sidebarOpen },
        ]"
    >
        <div class="medigi-viewer-toolbar">
            <eeg-toolbar
                :activeItems="activeItems"
            />
        </div>
        <div class="medigi-viewer-sidebar">
            <eeg-sidebar
                :items="resources"
                :loadingStudies="loadingStudies"
                v-on:element-status-changed="updateElements"
                v-on:file-dropped="handleFileDrop"
            />
        </div>
        <div ref="media" class="medigi-viewer-media">
            <div class="medigi-viewer-eegs">
                <eeg-display v-for="(resource, idx) in activeItems"
                    :key="`${$store.state.appName}-medigi-viewer-eeg-element-${resource.id}`"
                    :ref="`eeg-element`"
                    :cmPerSec="cmPerSec"
                    :containerSize="mediaContainerSize"
                    :electrodeSetup="electrodeSetup"
                    :layoutPosition="getElementLayoutPosition(idx)"
                    :marginBottom="traceMarginBottom"
                    :marginLeft="traceMarginLeft"
                    :montage="montage"
                    :resource="resource"
                    :yPad="yPad"
                    :uVperCm="uVperCm"
                />
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import ResizeObserver from 'resize-observer-polyfill'
import EdfSignal from '../../assets/edf/EdfSignal'

export default Vue.extend({
    components: {
        EegDisplay: () => import('./EegDisplay.vue'),
        EegSidebar: () => import('./EegSidebar.vue'),
        EegToolbar: () => import('./EegToolbar.vue'),
    },
    props: {
        loadingStudies: Boolean,
        resources: Array,
        sidebarOpen: Boolean,
    },
    data () {
        return {
            cmPerSec: 3,
            gridLayout: [0, 0],
            mediaContainerSize: [0, 0],
            traceMarginBottom: 30,
            traceMarginLeft: 80,
            yPad: 4, // Add pad amount of squares (0.5cm) above and below the top and bottom traces
            uVperCm: 100,
            // React to some property changes
            elementsChanged: 0,
        }
    },
    watch: {
        resources (value: any, old: any) {
            this.elementsChanged++
        },
    },
    computed: {
        activeItems (): EdfSignal[] {
            this.elementsChanged
            // Array.filter is a pain to make work in TypeScript
            const items = []
            for (let i=0; i<this.resources.length; i++) {
                if ((this.resources[i] as EdfSignal).isActive) {
                    items.push(this.resources[i] as EdfSignal)
                }
                // Make sure we don't exceed predefined grid dimensions
                if (this.gridLayout && this.gridLayout[0] && this.gridLayout[1]
                    && i === this.gridLayout[0]*this.gridLayout[1]
                ) {
                    return items
                }
            }
            return items
        },
        actualLayout (): number[] {
            const activeNum = this.activeItems.length
            const layout = [...this.gridLayout]
            if (!layout[0] && !layout[1]) {
                // Calculate grid dimensions automatically.
                // Number of colums >= number of rows, i.e. expand columns before rows.
                layout[0] = Math.ceil(Math.sqrt(activeNum))
            } else if (!layout[0]) {
                // Only cols are undefined
                layout[0] = Math.ceil(activeNum/layout[1])
            }
            if (!layout[1]) {
                // Calculate grid rows
                layout[1] = Math.ceil(activeNum/layout[0])
            }
            return layout
        },
    },
    methods: {
        getElementLayoutPosition: function (idx: number): number[][] {
            const layout = this.actualLayout
            // Calculate element position within the layout grid
            const colPos = Math.floor(idx/layout[0])
            const rowPos = idx%layout[0]
            return [[rowPos, layout[0]], [colPos, layout[1]]]
        },
        handleFileDrop: async function (event: DragEvent) {
            (this.$root as any).handleFileDrop(event, 'eeg')
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
            // Stop here if there are no traces displayed
            if (!this.activeItems.length) {
                return
            }
            this.$nextTick(() => {
                this.recalibrateCharts()
            })
        },
        /**
         * Recalibrate the data on any active charts.
         */
        recalibrateCharts: function () {
            if (Array.isArray(this.$refs['eeg-element'])) {
                this.$refs['eeg-element'].forEach((item: any) => {
                    item.recalibrateChart()
                    item.refreshNavigator()
                })
            } else {
                ;(this.$refs['eeg-element'] as any).recalibrateChart()
                ;(this.$refs['eeg-element'] as any).refreshNavigator()
            }
        },
        /**
         * Completely redraw any active charts.
         */
        redrawCharts: function () {
            if (Array.isArray(this.$refs['eeg-element'])) {
                this.$refs['eeg-element'].forEach((item: any) => {
                    item.redrawPlot(true)
                })
            } else {
                (this.$refs['eeg-element'] as any).redrawPlot()
            }
        },
        updateElements: function () {
            this.elementsChanged++
        },
    },
    mounted () {
        console.log('interface', this.resources)
        // Check for invalid config values (these should really come from outside the component in the future!)
        if (this.uVperCm <= 0 || this.cmPerSec <= 0) {
            console.error(`Vertical and horizontal scales must be greater than zero!`)
            return
        }
        if (this.yPad <= 0) {
            console.error(`Vertical padding must be greater than zero!`)
            return
        }
        // Set up resize observer for the media container
        new ResizeObserver(this.mediaResized).observe((this.$refs['media'] as Element))
    },
})
</script>

<style>
.medigi-viewer-eeg-interface {
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
    .medigi-viewer-eeg-interface.medigi-viewer-sidebar-closed {
        left: -240px;
    }
    .medigi-viewer-eeg-interface > .medigi-viewer-sidebar {
        grid-column-start: left-edge;
        grid-column-end: divider;
        grid-row-start: top-edge;
        grid-row-end: bottom-edge;
        overflow: auto;
    }
    .medigi-viewer-eeg-interface > .medigi-viewer-toolbar {
        grid-column-start: divider;
        grid-row-start: top-edge;
        grid-row-end: divider;
    }
    .medigi-viewer-eeg-interface > .medigi-viewer-media {
        position: relative;
        grid-column-start: divider;
        grid-row-start: divider;
        margin: 0 10px 10px 0;
        border: 1px solid var(--medigi-viewer-border-faint);
        overflow: hidden; /* Without this DICOM elements do not scale down */
    }
</style>
