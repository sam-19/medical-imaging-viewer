<template>

    <div ref="wrapper" class="medigi-viewer-waveform-wrapper" @mouseleave="hideAnnotationMenu">
        <div ref="container" :id="`container-${resource.id}-${instanceNum}`"
            @contextmenu.prevent
        ></div>
        <div ref="mousedrag" :class="[
            'medigi-viewer-ekg-mousedrag',
            { 'medigi-viewer-drag-active': this.mouseDragIndicator && !this.measurements },
            { 'medigi-viewer-hidden': !this.mouseDragIndicator },
        ]"></div>
        <div ref="measurements"
            :class="[
                'medigi-viewer-ekg-measurements',
                { 'medigi-viewer-hidden': !this.measurements }
            ]"
            @contextmenu.prevent
        >
            <div>
                <span>{{ $t('Distance') }}</span>
                <span v-if="measurements">{{ measurements.distance }} ms</span>
            </div>
            <div>
                <span>{{ $t('Amplitude') }}</span>
                <span v-if="measurements">{{ measurements.amplitude > 0 ? '+' : '' }}{{ measurements.amplitude }} µV</span>
            </div>
        </div>
    </div>

</template>

<script lang="ts">
import Vue from 'vue'
import { SignalResource } from '../../../types/assets'
// @ts-ignore: TSLint doesn't find the type definitions for Plotly.js, for some reason
import * as  Plotly from 'plotly.js/lib/index-basic.js'

let INSTANCE_NUM = 0

export default Vue.extend({
    props: {
        cmPermV: Number,
        cmPerSec: Number,
        containerSize: Array,
        displayedTraceCount: Number,
        firstTraceIndex: Number,
        marginBottom: Number,
        marginLeft: Number,
        pxPerHorizontalSquare: Number,
        pxPerVerticalSquare: Number,
        resource: Object, // SignalResource
        traceSpacing: Number,
        yAxisRange: Number,
        yPad: Number,
    },
    data () {
        return {
            chart: null as any,
            chartConfig: {
                // Props are initialized before data
                margin: { t: 0, r: 0, b: this.marginBottom, l: this.marginLeft },
                showlegend: false,
                dragmode: false,
                xaxis: {
                    tickmode: 'array',
                    ticklen: 5, // This serves as padding between axis and label
                    tickcolor: 'rgba(0,0,0,0)',
                    rangemode: 'tozero',
                    gridcolor: '#FFB6C1',
                    gridwidth: 1,
                    zerolinecolor: '#FFB6C1',
                    zerolinewidth: 1,
                    overlaying: 'x2',
                    fixedrange: true,
                },
                xaxis2: {
                    tickmode: 'array',
                    rangemode: 'tozero',
                    gridcolor: '#FFEDF0',
                    gridwidth: 1,
                    matches: 'x',
                    zeroline: false,
                    fixedrange: true,
                },
                yaxis: {
                    autorange: false,
                    tickmode: 'array',
                    ticklen: 10, // This serves as padding between axis and label
                    tickcolor: 'rgba(0,0,0,0)',
                    rangemode: 'tozero',
                    gridcolor: '#FFB6C1',
                    gridwidth: 1,
                    zerolinecolor: '#FFB6C1',
                    zerolinewidth: 1,
                    overlaying: 'y2',
                    fixedrange: true,
                },
                yaxis2: {
                    autorange: false,
                    tickmode: 'array',
                    rangemode: 'tozero',
                    gridcolor: '#FFEDF0',
                    gridwidth: 1,
                    matches: 'y',
                    zeroline: false,
                    fixedrange: true,
                },
            },
            chartOptions: {
                displayModeBar: false,
                responsive: false,
            },
            sensitivityAdjust: 1,
            viewStart: 0,
            viewEnd: 0,
            // Keep track of some event data for chart interaction
            lastHoverPoint: { x: -1, y: -1 },
            mouseDownPoint: { x: -1, y: -1 },
            mouseDownTrace: 0,
            // Display an indicator when mouse is dragged on the trace
            mouseDragIndicator: false,
            measurements: null as null | object,
            // We need a way to uniquely identify this component instance's elements
            // from other iterations of the same resource
            instanceNum: INSTANCE_NUM++,
        }
    },
    watch: {
    },
    computed: {
        channelSignals (): any[] {
            console.log(this.yAxisRange, this.yPad)
            const signals: any[] = []
            const max = (this.yAxisRange - this.yPad*2)/this.traceSpacing + 1
            for (let i=0; i<max; i++) {
                const chanLabel: string = this.resource.channels[i].label
                const traceColor = '#303030'
                // Wrap it into an object
                signals[i] = {
                    name: this.$t(chanLabel),
                    type: 'scattergl',
                    mode: 'lines',
                    x: this.xAxisRange,
                    y: [],
                    line: { color: traceColor, width: 1 },
                    hoverinfo: 'none',
                }
            }
            // Add something to x2, y2 to show the gridlines
            signals.push({
                name: '',
                x: this.xAxisRange,
                y: [],
                xaxis: 'x2',
                yaxis: 'y2',
                line: { color: 'rgba(0,0,0,0)', width: 0 },
                hoverinfo: 'none',
            })
            console.log(signals)
            return signals
        },
        mouseDragThreshold (): number {
            // Require at least two mm of mouse movement to register a drag event
            return this.$root.screenDPI/17.7
        },
        xAxisRange (): number[] {
            return (this.viewEnd - this.viewStart) > 0
                    ? [...Array(Math.floor(this.viewEnd-this.viewStart)).keys()]
                    : []
        },
        xAxisTicks (): number[] {
            const range = 5*(this.viewEnd - this.viewStart)/this.resource.resolution
            const ticks = []
            for (let i=0; i<range; i++) {
                ticks.push(i*this.resource.resolution/5)
            }
            return ticks
        },
        xAxis2Ticks (): number[] {
            const range = 5*(this.viewEnd - this.viewStart)/this.resource.resolution
            const ticks = []
            for (let i=0; i<range; i++) {
                ticks.push(
                    (i + 1/5)*this.resource.resolution/5,
                    (i + 2/5)*this.resource.resolution/5,
                    (i + 3/5)*this.resource.resolution/5,
                    (i + 4/5)*this.resource.resolution/5,
                )
            }
            return ticks
        },
        xAxisValues (): string[] {
            const range = 5*(this.viewEnd - this.viewStart)/this.resource.resolution
            const values = []
            for (let i=0; i<range; i++) {
                if (!i || i%5) {
                    values.push('')
                    continue
                }
                let point = this.viewStart/this.resource.resolution + i/5
                let hrs: number = Math.floor(point/60/60)
                let mins: number = Math.floor((point - hrs*60*60)/60)
                let secs: number = point - hrs*60*60 - mins*60
                let timestamp = ''
                if (hrs) {
                    timestamp = hrs.toString() + ':'
                }
                if (mins) {
                    if (hrs) {
                        timestamp += mins.toString().padStart(2, '0') + ':'
                    } else {
                        timestamp += mins + ':'
                    }
                } else {
                    if (hrs) {
                        timestamp += '00:'
                    } else {
                        timestamp = '0:'
                    }
                }
                if (secs) {
                    timestamp += secs.toString().padStart(2, '0')
                } else {
                    timestamp += '00'
                }
                values.push(timestamp)
            }
            return values
        },
        yAxisTicks (): number[] {
            const ticks = []
            for (let i=0; i<=this.yAxisRange; i++) {
                ticks.push(i)
            }
            return ticks
        },
        yAxisTicks2 (): number[] {
            const ticks = []
            for (let i=1; i<=this.yAxisRange*5; i++) {
                if (i%5) {
                    ticks.push(i/5)
                }
            }
            return ticks
        },
        yAxisValues (): string[] {
            const values = []
            values.push(...Array(this.yPad).fill(''))
            for (let i=0; i<this.yAxisRange - this.yPad; i++) {
                if (i%this.traceSpacing) {
                    values.push('')
                } else {
                    values.push(this.getChannelLabel(i/this.traceSpacing + this.firstTraceIndex))
                }
            }
            values.push('') // Add one final empty label (for the axis line?)
            return values.reverse()
        },
    },
    methods: {
        calculateMontageSignals: function () {
        },
        getChannelLabel: function (index: number): string {
            const labelParts = this.resource.channels[index].label.toLowerCase().split(/[_|\s]+/g)
            const validLabels: any = {
                i: 'I', ii: 'II', iii: 'III', avr: 'aVR', avl: 'aVL', avf: 'aVF',
                v1: 'V1', v2: 'V2', v3: 'V3', v4: 'V4', v5: 'V5', v6: 'V6'
            }
            for (let i=0; i<labelParts.length; i++) {
                if (labelParts[i] in validLabels) {
                    // Return a standardized channel label
                    return validLabels[labelParts[i]]
                }
            }
            // Fallback: just return the label
            return this.resource.channels[index].label
        },
        handleMouseDown: function (e: any) {
            this.mouseDragIndicator = false
            this.measurements = null
            this.mouseDownPoint = { x: e.offsetX, y: e.offsetY }
            // Unregister mouseout or it will trigger when the cover layer is drawn
            ;(this.$refs['wrapper'] as HTMLDivElement).removeEventListener('mouseout', this.handleMouseOut)
            this.$nextTick(() => {
                const dragOverlay = document.querySelector('body > .dragcover')
                dragOverlay?.addEventListener('mousemove', this.handleMouseMove)
                dragOverlay?.addEventListener('mouseout', this.handleMouseOut)
                dragOverlay?.addEventListener('mouseup', (e: any) => {
                    dragOverlay?.removeEventListener('mousemove', this.handleMouseMove)
                    dragOverlay?.removeEventListener('mouseout', this.handleMouseOut)
                    // Reapply mouseout listener
                    ;(this.$refs['wrapper'] as HTMLDivElement).addEventListener('mouseout', this.handleMouseOut)
                    // Pass event to mouse up handler
                    this.handleMouseUp(e)
                })
            })
        },
        /**
         * Handle mouse hover events fired by Plotly.
         */
        handleMouseHover: function (e: any) {
            // Store the last hover point for drag detection
            this.lastHoverPoint = {
                x: e.event.offsetX,
                y: e.event.offsetY,
            }
        },
        /**
         * Handle mouse move events fired by the drag cover element.
         */
        handleMouseMove: function (e: any) {
            if (this.mouseDownPoint.x < 0 || this.mouseDownPoint.y < 0) {
                return
            }
            if (this.$store.state.activeTool !== 'measure') {
                // Only measurements require this right now
                return
            }
            const wrapperPos = (this.$refs['wrapper'] as HTMLDivElement).getBoundingClientRect()
            // Do not allow dragging outside the wrapper
            if (e.offsetX < wrapperPos.left + this.marginLeft || e.offsetX > wrapperPos.right
                || e.offsetY < wrapperPos.top || e.offsetY > wrapperPos.bottom - this.marginBottom
            ) {
                this.handleMouseOut(e)
                return
            }
            if (Math.abs(e.offsetX - wrapperPos.left - this.mouseDownPoint.x) >= this.mouseDragThreshold
                || this.mouseDragIndicator
            ) {
                // Check which trace the mouse down event happened at
                const traceHeight = this.pxPerVerticalSquare*this.traceSpacing
                const startPos = this.pxPerVerticalSquare*this.yPad - traceHeight/2
                this.mouseDownTrace = Math.floor((this.mouseDownPoint.y - startPos)/traceHeight)
                if (this.mouseDownTrace < 0 || this.mouseDownTrace >= (this.yAxisRange - this.yPad*2)/this.traceSpacing + 1) {
                    // Mouse down position is out of bounds
                    return
                }
                const dragEl = (this.$refs['mousedrag'] as HTMLDivElement)
                if (!this.mouseDragIndicator) {
                    const top = startPos + this.mouseDownTrace*traceHeight
                    dragEl.style.top = top > 0 ? `${top}px` : '0px'
                    dragEl.style.height = `${traceHeight}px`
                    this.mouseDragIndicator = true
                }
                // The drag cover div spans the entire page, so have to adjust before comparing values
                const relXOffset = e.offsetX - wrapperPos.left
                const wrapperWidth = wrapperPos.right - wrapperPos.left
                if (this.mouseDownPoint.x < relXOffset) {
                    // Dragging from left to right
                    // Place static left marker to mouse down position
                    dragEl.style.left = `${this.mouseDownPoint.x}px`
                    // Update right position dynamically
                    dragEl.style.right = `${wrapperWidth - relXOffset - 1}px`
                } else {
                    // Dragging from right to left
                    // Place static right marker to mouse down position
                    dragEl.style.right = `${wrapperWidth - this.mouseDownPoint.x - 1}px`
                    // Update left position dynamically
                    dragEl.style.left = `${relXOffset}px`
                }
                // Update last hover position (Plotly doesn't pass hover event through when dragging)
                this.lastHoverPoint = {
                    x: e.offsetX - wrapperPos.left,
                    y: e.offsetY - wrapperPos.top
                }
            }
        },
        /**
         * Handle the mouse leaving trace area.
         */
        handleMouseOut: function (e: any) {
            this.mouseDragIndicator = false
            this.measurements = null
            this.lastHoverPoint = { x: -1, y: -1 }
            this.mouseDownPoint = { x: -1, y: -1 }
        },
        handleMouseUp: function (e: any) {
            // Check if we have a drag selection
            if (this.mouseDragIndicator) {
                if (this.lastHoverPoint.x >= 0) {
                    // Handle drag selection
                    if (this.$store.state.activeTool === 'measure' && !this.measurements) {
                        const wrapperPos = (this.$refs['wrapper'] as HTMLDivElement).getBoundingClientRect()
                        const startX = this.mouseDownPoint.x - this.marginLeft
                        const startPos = Math.round((startX/(this.pxPerHorizontalSquare*2))*(this.resource.resolution/this.cmPerSec))
                        const endX = e.offsetX - wrapperPos.left - this.marginLeft
                        const endPos = Math.round((endX/(this.pxPerHorizontalSquare*2))*(this.resource.resolution/this.cmPerSec))
                        // Use default 0 amplitude if start or end is outside the trace bounds
                        const startAmp = startPos >= 0 && startPos <= this.resource.sampleCount
                                         ? this.resource.channels[this.mouseDownTrace + this.firstTraceIndex].signals[startPos] : 0
                        const endAmp = endPos >= 0 && endPos <= this.resource.sampleCount
                                       ? this.resource.channels[this.mouseDownTrace + this.firstTraceIndex].signals[endPos] : 0
                        this.measurements = {
                            distance: Math.round(((endPos - startPos)/this.resource.resolution)*1000),
                            amplitude: endAmp - startAmp,
                        }
                        ;(this.$refs['measurements'] as HTMLDivElement).style.top = `${e.y - wrapperPos.top}px`
                        ;(this.$refs['measurements'] as HTMLDivElement).style.left = `${e.x - wrapperPos.left}px`
                    }
                }
            }
            this.mouseDownPoint = { x: -1, y: -1 }
        },
        hideAnnotationMenu: function () {

        },
        recalculateViewBounds: function ()  {
            // Deduct the chart's left and right margins
            let viewWidth: number = -this.marginLeft
            if (document.fullscreenElement === null) {
                viewWidth += this.containerSize[0] as number
            } else {
                viewWidth += screen.width
            }
            const newWidth = this.resource.resolution*(viewWidth/(this.pxPerHorizontalSquare*5))
            this.viewEnd = this.viewStart + newWidth
        },
        recalibrateChart: function () {
            this.recalculateViewBounds()
            // Update chart dimensions and the y-axis (x-axis is updated in refreshTraces method)
            const y2TickVals = this.yAxisTicks2
            const chartLayout = {
                width: this.containerSize[0],
                height: this.pxPerVerticalSquare*this.yAxisRange + this.marginBottom,
                yaxis: Object.assign({}, this.chartConfig.yaxis, {
                    range: [0, this.yAxisRange],
                    tickvals: this.yAxisTicks,
                    ticktext: this.yAxisValues,
                }),
                yaxis2: Object.assign({}, this.chartConfig.yaxis2, {
                    range: [0, this.yAxisRange],
                    tickvals: y2TickVals,
                    ticktext: Array(y2TickVals.length).fill(''),
                }),
            }
            console.log(chartLayout)
            Plotly.relayout(this.$refs['container'], chartLayout)
            this.refreshTraces()
        },
        redrawPlot: function () {
            this.chart = Plotly.newPlot(
                this.$refs['container'],
                this.channelSignals,
                this.chartConfig,
                this.chartOptions
            ).then(() => {
                // Render Y-axis signal labels and signal data
                this.recalibrateChart()
            })
        },
        refreshTraces: function () {
            // Y-axis values for each channel
            const yValues = []
            const max = (this.yAxisRange - this.yPad*2)/this.traceSpacing + 1
            const ampScale = 2/(this.cmPermV*1000) // 2 squares per 1000 uV
            for (let i=0; i<max; i++) {
                const offset = (max - i - 1)*this.traceSpacing + this.yPad
                yValues.push([] as (number|null)[])
                for (let j=0; j<this.xAxisRange.length; j++) {
                    if (j < this.resource.channels[i+this.firstTraceIndex].signals.length) {
                        let sigVal = this.resource.channels[i+this.firstTraceIndex].signals[j]*ampScale
                        // Apply required corrections
                        if (this.resource.channels[i+this.firstTraceIndex].baseline) {
                            // According to my sources the baseline correction is really
                            // applied before the sensitivity corrections
                            sigVal += this.resource.channels[i+this.firstTraceIndex].baseline
                        }
                        if (this.resource.channels[i+this.firstTraceIndex].sensitivity) {
                            sigVal *= this.resource.channels[i+this.firstTraceIndex].sensitivity
                        }
                        if (this.resource.channels[i+this.firstTraceIndex].sensitivityCF) {
                            sigVal *= this.resource.channels[i+this.firstTraceIndex].sensitivityCF
                        }
                        yValues[i].push(sigVal + offset)
                    } else {
                        yValues[i].push(null)
                    }
                }
            }
            // Update chart signal data
            Plotly.restyle(this.$refs['container'], 'x', this.xAxisRange)
            Plotly.restyle(this.$refs['container'], 'y', yValues)
            // Update x-axis styles
            const x2TickVals = this.xAxis2Ticks
            const chartLayout = {
                xaxis: Object.assign({}, this.chartConfig.xaxis, {
                    tickvals: this.xAxisTicks,
                    ticktext: this.xAxisValues,
                }),
                xaxis2: Object.assign({}, this.chartConfig.xaxis2, {
                    tickvals: x2TickVals,
                    ticktext: Array(x2TickVals.length).fill(''),
                }),
            }
            // Bind event listeners
            ;(this.$refs['container'] as any).on('plotly_hover', this.handleMouseHover)
            Plotly.relayout(this.$refs['container'], chartLayout)
        },
    },
    mounted () {
        // Calculate view bounds
        this.recalculateViewBounds()
        this.redrawPlot()
        // Bind event listeners
        ;(this.$refs['container'] as HTMLDivElement).addEventListener('mousedown', this.handleMouseDown)
        ;(this.$refs['container'] as HTMLDivElement).addEventListener('mouseup', this.handleMouseUp)
        ;(this.$refs['wrapper'] as HTMLDivElement).addEventListener('mouseout', this.handleMouseOut)
        // Set ruler scale
        const hSqr = this.pxPerHorizontalSquare
        const vSqr = this.pxPerVerticalSquare
        ;(document.querySelector('.medigi-viewer-ekg-mousedrag') as HTMLDivElement).style.backgroundSize
            = `${hSqr}px ${hSqr}px, ${vSqr}px ${vSqr}px, ${hSqr/5}px ${hSqr/5}px, ${vSqr/5}px ${vSqr/5}px`

        console.log(this.yAxisTicks, this.yAxisValues)
    }
})
</script>

<style>
.medigi-viewer-ekg-mousedrag {
    position: absolute;
    background-color: rgba(255, 0, 0, 0.2);
    pointer-events: none;
    opacity: 0.5;
}
    .medigi-viewer-ekg-mousedrag.medigi-viewer-ekg-ruler {
        border-bottom: solid 1px var(--medigi-viewer-border);
        background-image:
            linear-gradient(rgba(0, 0, 0, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.4) 1px, transparent 1px),
            linear-gradient(rgba(0, 0, 0, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.2) 1px, transparent 1px);
    }
        .medigi-viewer-ekg-mousedrag.medigi-viewer-ekg-ruler.medigi-viewer-drag-active {
            background-color: rgba(255, 0, 0, 0.1);
            border-right: solid 1px var(--medigi-viewer-border);
            opacity: 1;
        }
    .medigi-viewer-ekg-mousedrag:not(.medigi-viewer-ekg-ruler).medigi-viewer-drag-active {
        background-color: rgba(255, 0, 0, 0.1);
        border-left: solid 1px var(--medigi-viewer-border);
        border-right: solid 1px var(--medigi-viewer-border);
        opacity: 1;
    }
.medigi-viewer-ekg-measurements {
    position: absolute;
    background-color: var(--medigi-viewer-background-highlight);
    padding: 6px 10px;
    border: solid 1px var(--medigi-viewer-border);
    pointer-events: none;
}
    .medigi-viewer-ekg-measurements > div > span {
        display: inline-block;
        height: 24px;
        line-height: 24px;
    }
    .medigi-viewer-ekg-measurements > div > span:nth-child(1) {
        width: 80px;
    }
.medigi-viewer-hidden {
    display: none;
}
/* Do not allow adjusting the range */
.medigi-viewer-waveform-wrapper .rangeslider-grabber-min,
.medigi-viewer-waveform-wrapper .rangeslider-grabber-max {
    pointer-events: none !important;
}
</style>
