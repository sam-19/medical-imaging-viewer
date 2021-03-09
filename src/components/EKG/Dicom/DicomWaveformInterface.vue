<template>
    <div :id="`${$store.state.appName}-medigi-viewer-ekg-interface`"
        :class="[
            'medigi-viewer-dicom-waveform-interface',
            { 'medigi-viewer-sidebar-closed': !sidebarOpen },
        ]"
    >
        <div class="medigi-viewer-toolbar">
            <ekg-toolbar
                :activeItems="activeItems"
                :displayedTraceCount="displayedTraceCount"
                :firstTraceIndex.sync="firstTraceIndex"
            />
        </div>
        <div class="medigi-viewer-sidebar">
            <ekg-sidebar
                :items="ekgResources"
                v-on:element-status-changed="updateElements"
                v-on:file-dropped="handleFileDrop"
            />
        </div>
        <div ref="media" class="medigi-viewer-media">
            <div class="medigi-viewer-waveforms">
                <dicom-waveform-display v-for="(resource, idx) in activeItems"
                    :key="`${$store.state.appName}-medigi-viewer-element-${resource.id}`"
                    :ref="`waveform-element`"
                    :cmPermV="cmPermV"
                    :cmPerSec="cmPerSec"
                    :containerSize="mediaContainerSize"
                    :displayedTraceCount="displayedTraceCount"
                    :firstTraceIndex="firstTraceIndex"
                    :layoutPosition="getElementLayoutPosition(idx)"
                    :marginBottom="traceMarginBottom"
                    :marginLeft="traceMarginLeft"
                    :pxPerHorizontalSquare="pxPerHorizontalSquare"
                    :pxPerVerticalSquare="pxPerVerticalSquare"
                    :resource="resource"
                    :traceSpacing="traceSpacing"
                    :yAxisRange="yAxisRange"
                    :yPad="yPad"
                />
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import ResizeObserver from 'resize-observer-polyfill'
import { SignalResource } from '../../../types/assets'
import DicomWaveform from '../../../assets/dicom/DicomWaveform'

export default Vue.extend({
    components: {
        EkgSidebar: () => import('../EkgSidebar.vue'),
        EkgToolbar: () => import('../EkgToolbar.vue'),
        DicomWaveformDisplay: () => import('./DicomWaveformDisplay.vue'),
    },
    props: {
        ekgResources: Array,
        sidebarOpen: Boolean,
    },
    data () {
        return {
            activeItems: [] as DicomWaveform[],
            cmPermV: 1,
            cmPerSec: 2.5,
            displayedTraceCount: 0, // Number of traces displayed is synchronized between all displayed recordings
            firstTraceIndex: 0, // First displayed trace index is synchronized between all displayed recordings
            gridLayout: [0, 0],
            lastXRange: 0,
            lastYRange: 0,
            mediaContainerSize: [0, 0],
            pxPerHorizontalSquare: 0,
            pxPerVerticalSquare: 0,
            traceMarginBottom: 50,
            traceMarginLeft: 50,
            traceSpacing: 6, // The number of squares (0.5cm) between traces
            yAxisRange: 0,
            yPad: 4, // Add pad amount of squares (0.5cm) above and below the top and bottom traces
        }
    },
    watch: {
        ekgResources (value: any, old: any) {
            console.log(this.ekgResources)
            if (this.ekgResources.length) {
                this.activeItems = this.ekgResources as DicomWaveform[]
            }
        },
    },
    computed: {
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
            // Display either all 12, 6, 4, 2 or just one trace at a time
            // Required height is trace spacing plus padding
            const traceHeight = this.pxPerVerticalSquare*this.traceSpacing
            const pad = (this.yPad*this.pxPerVerticalSquare)*2 + this.traceMarginBottom
            let traceCount = 12
            if ((this.mediaContainerSize[1] as number) < traceHeight*1 + pad) {
                traceCount = 1
            } else if ((this.mediaContainerSize[1] as number) < traceHeight*3 + pad) {
                traceCount = 2
            } else if ((this.mediaContainerSize[1] as number) < traceHeight*5 + pad) {
                traceCount = 4
            } else if ((this.mediaContainerSize[1] as number) < traceHeight*11 + pad) {
                traceCount = 6
            }
            // Add one trace height for each trace (except the last one) plus
            // padding for top and bottom
            this.yAxisRange = (traceCount - 1)*this.traceSpacing + 2*this.yPad
            this.$nextTick(() => {
                if (Array.isArray(this.$refs['waveform-element'])) {
                    this.$refs['waveform-element'].forEach((item: any) => {
                        if (this.yAxisRange !== this.lastYRange) {
                            item.redrawPlot()
                            this.lastYRange = this.yAxisRange
                        } else if (this.mediaContainerSize[0] !== this.lastXRange) {
                            item.recalibrateChart()
                            this.lastXRange = this.mediaContainerSize[0]
                        }
                    })
                } else if (this.$refs['waveform-element']) {
                    if (this.yAxisRange !== this.lastYRange) {
                        (this.$refs['waveform-element'] as any).redrawPlot()
                        this.lastYRange = this.yAxisRange
                    } else if (this.mediaContainerSize[0] !== this.lastXRange) {
                        (this.$refs['waveform-element'] as any).recalibrateChart()
                        this.lastXRange = this.mediaContainerSize[0]
                    }
                }
            })
        },
        updateElements: function () {

        },
    },
    mounted () {
        // Check for invalid config values
        if (this.cmPermV <= 0 || this.cmPerSec <= 0) {
            console.error(`Vertical and horizontal scales must be greater than zero!`)
            return
        }
        if (this.traceSpacing <= 0 || this.yPad <= 0) {
            console.error(`Vertical padding and spacing between traces must be greater than zero!`)
            return
        }
        // Set up resize observer for the media container
        new ResizeObserver(this.mediaResized).observe((this.$refs['media'] as Element))
        // Calculate EKG paper square sizes
        this.pxPerHorizontalSquare = Math.floor(((this.$root.screenDPI/2.54)*this.cmPerSec)/5)
        this.pxPerVerticalSquare = Math.floor(((this.$root.screenDPI/2.54)*this.cmPermV)/2)
        // Trigger the resize observer to calculate rest of the properties
        this.mediaResized()
        // TEST
        this.activeItems = this.ekgResources as DicomWaveform[]
        this.$nextTick(() => {
            this.mediaResized()
        })
    },
})
</script>

<style>
.medigi-viewer-dicom-waveform-interface {
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
    .medigi-viewer-dicom-waveform-interface.medigi-viewer-sidebar-closed {
        left: -240px;
    }
    .medigi-viewer-dicom-waveform-interface > .medigi-viewer-sidebar {
        grid-column-start: left-edge;
        grid-column-end: divider;
        grid-row-start: top-edge;
        grid-row-end: bottom-edge;
        overflow: auto;
    }
    .medigi-viewer-dicom-waveform-interface > .medigi-viewer-toolbar {
        grid-column-start: divider;
        grid-row-start: top-edge;
        grid-row-end: divider;
    }
    .medigi-viewer-dicom-waveform-interface > .medigi-viewer-media {
        grid-column-start: divider;
        grid-row-start: divider;
        margin: 0 10px 10px 0;
        border: 1px solid var(--medigi-viewer-border-faint);
        overflow: hidden; /* Without this DICOM elements do not scale down */
    }
</style>
