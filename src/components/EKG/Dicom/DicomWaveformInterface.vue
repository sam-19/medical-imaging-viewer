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
                :items="resources"
                :loadingStudies="loadingStudies"
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
import * as cornerstone from 'cornerstone-core'
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader'
import DicomWaveform from '../../../assets/dicom/DicomWaveform'
import LocalFileLoader from '../../../assets/loaders/LocalFileLoader'
import { FileSystemItem } from '../../../types/assets'

export default Vue.extend({
    components: {
        EkgSidebar: () => import('../EkgSidebar.vue'),
        EkgToolbar: () => import('../EkgToolbar.vue'),
        DicomWaveformDisplay: () => import('./DicomWaveformDisplay.vue'),
    },
    props: {
        loadingStudies: Boolean,
        resources: Array,
        sidebarOpen: Boolean,
    },
    data () {
        return {
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
            traceMarginBottom: 20,
            traceMarginLeft: 50,
            traceSpacing: 6, // The number of squares (0.5cm) between traces
            yAxisRange: 0,
            yPad: 4, // Add pad amount of squares (0.5cm) above and below the top and bottom traces
            // React to some property changes
            elementsChanged: 0,
        }
    },
    watch: {
        ekgResources (value: any, old: any) {
            this.elementsChanged++
        },
        firstTraceIndex (value: number, old: number) {
            this.redrawCharts()
        },
    },
    computed: {
        activeItems (): DicomWaveform[] {
            this.elementsChanged
            // Array.filter is a pain to make work in TypeScript
            const items = []
            for (let i=0; i<this.resources.length; i++) {
                if ((this.resources[i] as DicomWaveform).isActive) {
                    items.push(this.resources[i] as DicomWaveform)
                }
                // Make sure we don't exceed predefined grid dimensions
                if (this.gridLayout && this.gridLayout[0] && this.gridLayout[1]
                    && i === this.gridLayout[0]*this.gridLayout[1]
                ) {
                    return items
                }
            }
            if (!items.length) {
                // Reset first trace index
                this.firstTraceIndex = 0
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
        addFileAsRecording: function (file: File) {
            // This is SO BAD, change this to a custom method utilizing dicomParser
            const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file)
            if (imageId) {
                cornerstone.loadImage(imageId).then((image: any) => {
                    // Check if it is actually an image?
                    // These methods should just be moved to root I think.
                }).catch((response: any) => {
                    if (response.dataSet && response.dataSet.elements && response.dataSet.elements.x54000100) {
                        // Add the waveform resource to list of EKGs
                        this.$root.$emit('add-ekg-resource', new DicomWaveform('Waveform', response.dataSet.elements))
                    }
                })
            }
        },
        getElementLayoutPosition: function (idx: number): number[][] {
            const layout = this.actualLayout
            // Calculate element position within the layout grid
            const colPos = Math.floor(idx/layout[0])
            const rowPos = idx%layout[0]
            return [[rowPos, layout[0]], [colPos, layout[1]]]
        },
        handleFileDrop: async function (event: DragEvent) {
            (this.$root as any).handleFileDrop(event)
            return
            const fileLoader = new LocalFileLoader()
            fileLoader.readFilesFromSource(event).then((fileTree) => {
                if (fileTree) {
                    let rootDir = fileTree
                    while (rootDir.files && !rootDir.files.length &&
                           rootDir.directories && rootDir.directories.length === 1
                    ) {
                        // Recurse until we arrive at the root folder of the image sets
                        rootDir = rootDir.directories[0]
                    }
                    // Next, check if this is a single file dir or several dirs
                    if (!rootDir.directories?.length && rootDir.files?.length) {
                        if (rootDir.files.length > 1) {
                            // Add each individual file as a separate recording
                            for (let i=0; i<rootDir.files.length; i++) {
                                this.addFileAsRecording(rootDir.files[i].file as File)
                            }
                        } else {
                            // Single file as an image
                            this.addFileAsRecording(rootDir.files[0].file as File)
                        }
                    } else if (rootDir.directories?.length) {
                        // Try to add each individual dir as an image or image stack
                        // First check that each directory really contains only files, skip those that don't
                        for (let i=0; i<rootDir.directories.length; i++) {
                            if (rootDir.directories[i].directories?.length) {
                                console.warn(`${rootDir.directories[i].path} was omitted because it contained subdirectories.`)
                                continue
                            } else if (!rootDir.directories[i].files?.length) {
                                console.warn(`${rootDir.directories[i].path} was omitted because it was empty.`)
                                continue
                            } else {
                                // All files as separate recordings
                                rootDir.directories[i].files?.forEach((fsItem: FileSystemItem) => {
                                    this.addFileAsRecording(fsItem.file as File)
                                })
                            }
                        }
                    } else {
                        console.warn("Dropped item had an empty root directory!")
                    }
                }
            }).catch((error: Error) => {
                // TODO: Implement errors in the file loader
            })
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
            // Required height is trace spacing plus padding plus navigator trace height
            const traceHeight = this.pxPerVerticalSquare*this.traceSpacing
            const pad = (this.yPad*this.pxPerVerticalSquare)*2 + this.traceMarginBottom + 100
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
            this.displayedTraceCount = traceCount
            // Add one trace height for each trace (except the last one) plus
            // padding for top and bottom
            this.yAxisRange = (traceCount - 1)*this.traceSpacing + 2*this.yPad
            // Stop here if there are no traces displayed
            if (!this.activeItems.length) {
                return
            }
            // Check if we need to change the first displayed trace index
            if (this.activeItems[0].channels.length < this.displayedTraceCount + this.firstTraceIndex) {
                const newFirstIndex = this.activeItems[0].channels.length - this.displayedTraceCount
                this.firstTraceIndex = newFirstIndex > 0 ? newFirstIndex : 0
            }
            // Update charts as needed
            if (this.yAxisRange !== this.lastYRange) {
                this.lastYRange = this.yAxisRange
                this.$nextTick(() => {
                    this.redrawCharts()
                })
            } else if (this.mediaContainerSize[0] !== this.lastXRange) {
                this.lastXRange = this.mediaContainerSize[0]
                this.$nextTick(() => {
                    this.recalibrateCharts()
                })
            }
        },
        /**
         * Recalibrate the data on any active charts.
         */
        recalibrateCharts: function () {
            if (Array.isArray(this.$refs['waveform-element'])) {
                this.$refs['waveform-element'].forEach((item: any) => {
                    item.recalibrateChart()
                    item.refreshNavigator()
                })
            } else {
                ;(this.$refs['waveform-element'] as any).recalibrateChart()
                ;(this.$refs['waveform-element'] as any).refreshNavigator()
            }
        },
        /**
         * Completely redraw any active charts.
         */
        redrawCharts: function () {
            if (Array.isArray(this.$refs['waveform-element'])) {
                this.$refs['waveform-element'].forEach((item: any) => {
                    item.redrawPlot()
                })
            } else {
                (this.$refs['waveform-element'] as any).redrawPlot()
            }
        },
        updateElements: function () {
            this.elementsChanged++
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
        position: relative;
        grid-column-start: divider;
        grid-row-start: divider;
        margin: 0 10px 10px 0;
        border: 1px solid var(--medigi-viewer-border-faint);
        overflow: hidden; /* Without this DICOM elements do not scale down */
    }
</style>
