<template>

    <div ref="wrapper" class="medigi-viewer-waveform-wrapper" @mouseleave="hideAnnotationMenu">
        <div ref="trace" class="medi-viewer-waveform-trace">
            <div ref="container" @contextmenu.prevent></div>
            <div ref="mousedrag" :class="[
                'medigi-viewer-ekg-mousedrag',
                { 'medigi-viewer-drag-active': mouseDragIndicator && !measurements },
                { 'medigi-viewer-hidden': !mouseDragIndicator },
                { 'medigi-viewer-ekg-ruler': $store.state.SETTINGS.ekg.showRuler },
            ]"></div>
            <div ref="measurements"
                :class="[
                    'medigi-viewer-ekg-measurements',
                    { 'medigi-viewer-hidden': !measurements }
                ]"
                @contextmenu.prevent
            >
                <div>
                    <span>{{ t('Distance') }}</span>
                    <span v-if="measurements">{{ measurements.distance }} ms</span>
                </div>
                <div>
                    <span>{{ t('Amplitude') }}</span>
                    <span v-if="measurements">{{ measurements.amplitude > 0 ? '+' : '' }}{{ measurements.amplitude }} µV</span>
                </div>
            </div>
        </div>
        <!-- EKG channel labels -->
        <div v-for="(n, idx) in displayedTraceCount" :key="`medigi-dicom-waveform-label-${instanceNum}-${idx}`"
            class="medigi-viewer-waveform-label"
            :style="`top:${getChannelLabelOffset(idx) - 10}px`"
        >
            {{ getChannelLabel(firstTraceIndex + displayedTraceCount - n) }}
        </div>
        <!-- Navigator -->
        <div class="medigi-viewer-waveform-navigator">
            <div ref="navigator" @contextmenu.prevent></div>
            <div class="medigi-viewer-waveform-navigator-overlay-left" ref="navigator-overlay-left"></div>
            <div class="medigi-viewer-waveform-navigator-overlay-active" ref="navigator-overlay-active"></div>
            <div class="medigi-viewer-waveform-navigator-overlay-right" ref="navigator-overlay-right"></div>
        </div>
    </div>

</template>

<script lang="ts">
import Vue from 'vue'
// @ts-ignore: TSLint doesn't find the type definitions for Plotly.js, for some reason
import * as  Plotly from 'plotly'

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
                width: 0,
                margin: { t: 0, r: 0, b: this.marginBottom, l: 1 },//this.marginLeft },
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
                    ticklen: 0,//10, // This serves as padding between axis and label
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
            navigator: null as any,
            navigatorConfig: {
                width: 0,
                height: 100,
                margin: { t: 20, r: 20, b: 30, l: this.marginLeft },
                showlegend: false,
                dragmode: false,
                xaxis: {
                    tickmode: 'array',
                    ticklen: 5,
                    tickcolor: 'rgba(0,0,0,0)',
                    rangemode: 'tozero',
                    gridcolor: 'rgba(0,0,0,0)',
                    zerolinecolor: 'rgba(0,0,0,0)',
                    fixedrange: true,
                },
                yaxis: {
                    autorange: true,
                    tickmode: 'array',
                    ticklen: 10, // This serves as padding between axis and label
                    tickcolor: 'rgba(0,0,0,0)',
                    rangemode: 'tozero',
                    gridcolor: 'rgba(0,0,0,0)',
                    zerolinecolor: 'rgba(0,0,0,0)',
                    fixedrange: true,
                },
            },
            navigatorOptions: {
                displayModeBar: false,
                responsive: false,
            },
            sensitivityAdjust: 1,
            viewStart: 0,
            viewEnd: 0,
            lastViewBounds: [0, 0],
            downSampleFactor: 1,
            navigatorMaxSamples: 1000,
            navigatorMaxWidth: 0,
            // Keep track of some event data for chart interaction
            //lastHoverPoint: { x: -1, y: -1 },
            traceLeftPos: 0,
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
        downscaledResolution (): number {
            return Math.floor(this.resource.resolution/this.downSampleFactor)
        },
        channelSignals (): any[] {
            const signals: any[] = []
            const max = (this.yAxisRange - this.yPad*2)/this.traceSpacing + 1
            for (let i=0; i<max; i++) {
                const chanLabel: string = this.resource.channels[i].label
                const traceColor = '#303030'
                // Wrap it into an object
                signals[i] = {
                    name: this.t(chanLabel),
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
            return signals
        },
        mouseDragThreshold (): number {
            // Require at least two mm of mouse movement to register a drag event
            return this.$store.state.SETTINGS.screenDPI/17.7
        },
        navigatorSignal (): any {
            const navigatorColor = '#303030'
            const signal = {
                name: 'I',
                type: 'scattergl',
                mode: 'lines',
                x: [...Array(this.navigatorMaxSamples).keys()],
                y: [],
                line: { color: navigatorColor, width: 1 },
                hoverinfo: 'none',
            }
            return signal
        },
        navigatorTicks (): number[] {
            const step = this.navigatorMaxSamples/(this.resource.sampleCount/this.resource.resolution)
            const ticks = []
            let i = 0
            while (i*step < this.navigatorMaxSamples) {
                ticks.push(Math.floor(i*step))
                i++
            }
            return ticks
        },
        navigatorValues (): string[] {
            const range = this.navigatorTicks
            const values = [''] // Skip 0-value and last value
            for (let i=1; i<range.length; i++) {
                let hrs: number = Math.floor(i/60/60)
                let mins: number = Math.floor((i - hrs*60*60)/60)
                let secs: number = i - hrs*60*60 - mins*60
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
        xAxisRange (): number[] {
            return this.viewEnd > this.viewStart
                    ? [...Array(Math.floor(this.viewEnd-this.viewStart)).keys()]
                    : []
        },
        xAxisTicks (): number[] {
            const range = 5*(this.viewEnd - this.viewStart)/this.downscaledResolution
            const ticks = []
            for (let i=0; i<range; i++) {
                ticks.push(i*this.downscaledResolution/5)
            }
            return ticks
        },
        xAxis2Ticks (): number[] {
            const range = 5*(this.viewEnd - this.viewStart)/this.downscaledResolution
            const ticks = []
            for (let i=0; i<range; i++) {
                ticks.push(
                    (i + 1/5)*this.downscaledResolution/5,
                    (i + 2/5)*this.downscaledResolution/5,
                    (i + 3/5)*this.downscaledResolution/5,
                    (i + 4/5)*this.downscaledResolution/5,
                )
            }
            return ticks
        },
        xAxisValues (): string[] {
            const range = 5*(this.viewEnd - this.viewStart)/this.downscaledResolution
            const values = []
            for (let i=0; i<range; i++) {
                // Only print empty labels
                values.push('')
                continue
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
        /** Shorthand for component-specific translations */
        t: function (str: string, args?: any) {
            if (args) {
                return this.$t(`components.EKG.Dicom.DicomWaveformDisplay.${str}`, args)
            } else {
                return (this.$t('components.EKG.Dicom.DicomWaveformDisplay') as any)[str]
            }
        },
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
                    return this.t(validLabels[labelParts[i]])
                }
            }
            // Fallback: just return the label
            return this.resource.channels[index].label
        },
        getChannelLabelOffset: function (index: number): number {
            const max = (this.yAxisRange - this.yPad*2)/this.traceSpacing + 1
            const offset = (max - index - 1)*this.traceSpacing + this.yPad
            return offset*this.pxPerVerticalSquare
        },
        /**
         * Get datapoint value with all corrections applied.
         * @param number channel index
         * @param number datapoint index
         */
        getCorrectedSignalValue: function (channel: number, datapoint: number): number | undefined {
            if (channel >= this.resource.channels.length
                || datapoint >= this.resource.channels[channel].signal.length
            ) {
                return undefined
            }
            let sigVal = this.resource.channels[channel].signal[datapoint]
            // Apply required corrections
            if (this.resource.channels[channel].baseline) {
                // According to my sources the baseline correction is really
                // applied before the sensitivity corrections
                sigVal += this.resource.channels[channel].baseline
            }
            if (this.resource.channels[channel].sensitivity) {
                sigVal *= this.resource.channels[channel].sensitivity
            }
            if (this.resource.channels[channel].sensitivityCF) {
                sigVal *= this.resource.channels[channel].sensitivityCF
            }
            return sigVal
        },
        getViewEnd: function (clip=false): number  {
            // Calculate the chart's left and right margins
            let viewWidth: number = -this.marginLeft - 1
            if (document.fullscreenElement === null) {
                viewWidth += this.containerSize[0] as number
            } else {
                viewWidth += screen.width
            }
            const finalWidth = viewWidth > this.navigatorMaxWidth || clip ? viewWidth : this.navigatorMaxWidth
            const newWidth = this.downscaledResolution*(finalWidth/(this.pxPerHorizontalSquare*5))
            return this.viewStart + newWidth
        },
        handleMouseDown: function (e: any) {
            this.mouseDragIndicator = false
            this.measurements = null
            if (!this.$store.state.activeTool) {
                this.mouseDownPoint = { x: e.clientX, y: e.clientY }
                this.traceLeftPos = (this.$refs['trace'] as HTMLDivElement).scrollLeft
            } else if (this.$store.state.activeTool === 'measure') {
                this.mouseDownPoint = { x: e.offsetX, y: e.offsetY }
            }
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
            //this.lastHoverPoint = {
            //    x: e.event.offsetX,
            //    y: e.event.offsetY,
            //}
        },
        /**
         * Handle mouse move events fired by the drag cover element.
         */
        handleMouseMove: function (e: any) {
            if (this.mouseDownPoint.x < 0 || this.mouseDownPoint.y < 0) {
                return
            }
            const wrapperPos = (this.$refs['wrapper'] as HTMLDivElement).getBoundingClientRect()
            // If no tool is active, use drag to scroll the trace
            if (!this.$store.state.activeTool) {
                // No need to scroll if the entire trace is already visible
                if (this.viewStart === 0 && this.getViewEnd(true) >= this.resource.sampleCount/this.downSampleFactor) {
                    return
                }
                const dX = e.clientX - this.mouseDownPoint.x
                ;(this.$refs['trace'] as HTMLDivElement).scrollLeft = this.traceLeftPos - dX
                this.updateViewStart()
                this.refreshNavigatorOverlay()
            } else if (this.$store.state.activeTool === 'measure') {
                // Do not allow dragging outside the wrapper
                if (e.offsetX < wrapperPos.left || e.offsetX > wrapperPos.right
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
                        const yOffset = this.$store.state.SETTINGS.ekg.showRuler ? 1 : 0
                        const top = startPos + this.mouseDownTrace*traceHeight - yOffset
                        dragEl.style.top = top > 0 ? `${top}px` : '0px'
                        dragEl.style.height = `${traceHeight + yOffset}px`
                        this.mouseDragIndicator = true
                    }
                    // The drag cover div spans the entire page, so have to adjust before comparing values
                    const relXOffset = e.offsetX - wrapperPos.left
                    const wrapperWidth = wrapperPos.right - wrapperPos.left
                    const trueMouseDown = this.mouseDownPoint.x + this.marginLeft
                    if (trueMouseDown < relXOffset) {
                        // Dragging from left to right
                        // Place static left marker to mouse down position
                        dragEl.style.left = `${trueMouseDown}px`
                        // Update right position dynamically
                        dragEl.style.right = `${wrapperWidth - relXOffset - 1}px`
                    } else {
                        // Dragging from right to left
                        // Place static right marker to mouse down position
                        dragEl.style.right = `${wrapperWidth - trueMouseDown - 1}px`
                        // Update left position dynamically
                        dragEl.style.left = `${relXOffset - 1}px`
                    }
                    // Update last hover position (Plotly doesn't pass hover event through when dragging)
                    //this.lastHoverPoint = {
                    //    x: e.offsetX - wrapperPos.left,
                    //    y: e.offsetY - wrapperPos.top
                    //}
                }
            }
        },
        /**
         * Handle the mouse leaving trace area.
         */
        handleMouseOut: function (e: any) {
            this.mouseDragIndicator = false
            this.measurements = null
            //this.lastHoverPoint = { x: -1, y: -1 }
            this.mouseDownPoint = { x: -1, y: -1 }
        },
        handleMouseUp: function (e: any) {
            // Check if we have a drag selection
            if (this.mouseDragIndicator) {
                if (this.mouseDownPoint.x >= 0) {
                    // Handle drag selection
                    if (this.$store.state.activeTool === 'measure' && !this.measurements) {
                        const wrapperPos = (this.$refs['wrapper'] as HTMLDivElement).getBoundingClientRect()
                        // Horizontal paper scale; standard is 1 cm per 2 squares and 2.5cm per sec
                        const scaleF = (this.cmPerSec/2.5)/2
                        // Signal datapoints per second
                        const ptsPerSec = this.resource.resolution/this.cmPerSec
                        // Start position (datapoint)
                        const startX = this.mouseDownPoint.x
                        const startPos = Math.round((scaleF*startX/this.pxPerHorizontalSquare)*ptsPerSec)
                        const endX = e.offsetX - wrapperPos.left - this.marginLeft
                        // Since we measure from ruler end to ruler end, both inclusive, we need to fix the end position
                        // depending on the direction of the drag
                        const rToLFix = startX > endX ? 1 : 0
                        const endPos = Math.round((scaleF*(endX - rToLFix)/this.pxPerHorizontalSquare)*ptsPerSec)
                        // Use default 0 amplitude if start or end is outside the trace bounds
                        const startAmp = this.getCorrectedSignalValue(this.mouseDownTrace + this.firstTraceIndex, startPos)
                        //startPos >= 0 && startPos <= this.resource.sampleCount
                        //                 ? this.resource.channels[this.mouseDownTrace + this.firstTraceIndex].signal[startPos] : 0
                        const endAmp = this.getCorrectedSignalValue(this.mouseDownTrace + this.firstTraceIndex, endPos)
                        //endPos >= 0 && endPos <= this.resource.sampleCount
                        //               ? this.resource.channels[this.mouseDownTrace + this.firstTraceIndex].signal[endPos] : 0
                        this.measurements = {
                            distance: Math.round(((endPos - startPos)/this.resource.resolution)*1000),
                            amplitude: Math.round((endAmp || 0) - (startAmp || 0)),
                        }
                        ;(this.$refs['measurements'] as HTMLDivElement).style.top = `${e.y - wrapperPos.top}px`
                        ;(this.$refs['measurements'] as HTMLDivElement).style.left = `${e.x - wrapperPos.left}px`
                    }
                }
            }
            this.mouseDownPoint = { x: -1, y: -1 }
        },
        handleNavigatorMouseClick (e: any) {
            // TODO: Navigate to position when clicking on a hidden part on the navigator
            console.log('navigator click')
        },
        handleNavigatorMouseDown (e: any) {
            if (e.button !== 0 || e.buttons > 1) {
                // Only register left click for now
                return
            }
            const downPos = e.clientX
            const trace = this.$refs['trace'] as HTMLDivElement
            const startPos = trace.scrollLeft
            const mouseDrag = (e: any) => {
                // No need to scroll if the entire trace is already visible
                if (this.viewStart === 0 && this.getViewEnd(true) >= this.resource.sampleCount/this.downSampleFactor) {
                    return
                }
                const dX = downPos - e.clientX
                // Adjust for navigator resolution
                const naviTrueWidth = (this.$refs['navigator'] as HTMLDivElement).offsetWidth - this.marginLeft - 20
                const naviWidth = naviTrueWidth < this.navigatorMaxWidth ? naviTrueWidth : this.navigatorMaxWidth
                const relDragX = dX/naviWidth
                trace.scrollLeft = startPos + this.traceLeftPos - relDragX*trace.offsetWidth
                this.updateViewStart()
                this.refreshNavigatorOverlay()
            }
            const stopDrag = (e: any) => {
                dragCover.removeEventListener('mosemove', mouseDrag)
                dragCover.removeEventListener('moseup', stopDrag)
                dragCover.removeEventListener('moseleave', stopDrag)
                document.body.removeChild(dragCover)
            }
            // Create a dragcover element (that emulates the plotly dragcover)
            const dragCover = document.createElement('div')
            dragCover.className = 'dragcover'
            dragCover.style.position = 'fixed'
            dragCover.style.zIndex = '999999999'
            dragCover.style.background = 'none'
            dragCover.style.cursor = 'pointer'
            dragCover.style.top = '0px'
            dragCover.style.left = '0px'
            dragCover.style.right = '0px'
            dragCover.style.bottom = '0px'
            document.body.appendChild(dragCover)
            dragCover.addEventListener('mousemove', mouseDrag)
            dragCover.addEventListener('mouseup', stopDrag)
            // Failsafe, needed because releasing the mouse button out of the element would not register and
            // scrolling would be "stuck" on until another scroll event started
            dragCover.addEventListener('mouseleave', stopDrag)
        },
        hideAnnotationMenu: function () {

        },
        recalibrateChart: function (force=false) {
            this.viewEnd = this.getViewEnd()
            this.refreshNavigatorOverlay()
            // Redrawing the plot is slow, so only do it if necessary
            if (this.viewStart === this.lastViewBounds[0] && this.viewEnd === this.lastViewBounds[1]) {
                if (!force) {
                    return
                }
            } else {
                this.lastViewBounds = [this.viewStart, this.viewEnd]
            }
            // Update chart dimensions and the y-axis (x-axis is updated in refreshTraces method)
            const y2TickVals = this.yAxisTicks2
            const traceWidth = (this.containerSize[0] as number - this.marginLeft) > this.navigatorMaxWidth
                               ? this.containerSize[0] as number - this.marginLeft : this.navigatorMaxWidth
            const chartLayout = {
                width: traceWidth,
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
            Plotly.relayout(this.$refs['container'], chartLayout)
            this.refreshTraces()
        },
        redrawNavigator: function () {
            this.navigator = Plotly.newPlot(
                this.$refs['navigator'],
                [this.navigatorSignal],
                this.navigatorConfig,
                this.navigatorOptions
            ).then(() => {
                // Render Y-axis signal data
                this.refreshNavigator()
            })
        },
        redrawPlot: function () {
            this.chart = Plotly.newPlot(
                this.$refs['container'],
                this.channelSignals,
                this.chartConfig,
                this.chartOptions
            ).then(() => {
                // Render Y-axis signal labels and signal data
                this.recalibrateChart(true)
            })
        },
        refreshNavigator: function () {
            const signalLen = this.navigatorSignal.x.length
            const downSampleFactor = Math.ceil(this.resource.sampleCount/this.navigatorMaxSamples)
            const signal = [] as (number|null)[]
            for (let i=0; i<this.resource.channels.length; i++) {
                const chanLabel: string = this.resource.channels[i].label
                if (chanLabel.toLowerCase().indexOf('ii') === -1 && chanLabel.toLowerCase().indexOf('i') !== -1) {
                    // Use the I-channel signal
                    for (let j=0; j<signalLen; j++) {
                        const corrVal = this.getCorrectedSignalValue(i, j*downSampleFactor)
                        if (corrVal !== undefined) {
                            signal.push(corrVal)
                        } else {
                            signal.push(null)
                        }
                    }
                }
            }
            Plotly.restyle(this.$refs['navigator'], 'y', [signal])
            const availableWidth = document.fullscreenElement === null
                                   ? this.containerSize[0] : screen.width
            const naviWidth = (availableWidth as number) > this.navigatorMaxWidth + this.marginLeft + 20
                              ? this.navigatorMaxWidth + this.marginLeft + 20 : availableWidth
            const naviLayout = {
                width: naviWidth,
                xaxis: Object.assign({}, this.navigatorConfig.xaxis, {
                    tickvals: this.navigatorTicks,
                    ticktext: this.navigatorValues,
                }),
                yaxis: Object.assign({}, this.navigatorConfig.yaxis, {
                    tickvals: [0],
                    ticktext: ['I'],
                }),
            }
            Plotly.relayout(this.$refs['navigator'], naviLayout)
        },
        refreshNavigatorOverlay: function () {
            const viewEnd = this.getViewEnd(true)
            const naviTrueWidth = (this.$refs['navigator'] as HTMLDivElement).offsetWidth - this.marginLeft - 20
            const naviWidth = naviTrueWidth < this.navigatorMaxWidth ? naviTrueWidth : this.navigatorMaxWidth
            if (this.viewStart === 0 && viewEnd >= this.resource.sampleCount/this.downSampleFactor) {
                ;(this.$refs['navigator-overlay-left'] as HTMLDivElement).style.width = `0px`
                ;(this.$refs['navigator-overlay-active'] as HTMLDivElement).style.left = `${this.marginLeft}px`
                ;(this.$refs['navigator-overlay-active'] as HTMLDivElement).style.width = `${naviWidth}px`
                ;(this.$refs['navigator-overlay-right'] as HTMLDivElement).style.width = `0px`
                return
            }
            // leftPad is the margin applied to the main chart to make the Y-axis zero-line visible
            const leftPad = 1 * (this.pxPerHorizontalSquare*5/this.resource.resolution)
            const leftWidth = Math.max(Math.floor((this.viewStart/this.resource.sampleCount)*naviWidth - leftPad), 0)
            const actWidth = Math.ceil(((viewEnd - this.viewStart)/this.resource.sampleCount)*naviWidth)
            const rightWidth = Math.max(
                Math.floor(((this.resource.sampleCount - viewEnd)/this.resource.sampleCount)*naviWidth - leftPad), 0
            )
            ;(this.$refs['navigator-overlay-left'] as HTMLDivElement).style.width = `${leftWidth}px`
            ;(this.$refs['navigator-overlay-active'] as HTMLDivElement).style.left = `${leftWidth + this.marginLeft}px`
            ;(this.$refs['navigator-overlay-active'] as HTMLDivElement).style.width = `${actWidth}px`
            // Exclude the last pixel from right overlay width, so if shows as "visible" on the trace
            ;(this.$refs['navigator-overlay-right'] as HTMLDivElement).style.width = `${rightWidth}px`
        },
        refreshTraces: function () {
            // Y-axis values for each channel
            const yValues = []
            const max = (this.yAxisRange - this.yPad*2)/this.traceSpacing + 1
            const ampScale = 2*this.cmPermV/1000 // 2 squares per 1000 uV
            for (let i=0; i<max; i++) {
                const offset = (max - i - 1)*this.traceSpacing + this.yPad
                yValues.push([] as (number|null)[])
                for (let j=0; j<this.xAxisRange.length*this.downSampleFactor; j++) {
                    if (j%this.downSampleFactor) {
                        continue
                    }
                    const corrVal = this.getCorrectedSignalValue(i+this.firstTraceIndex, j)
                    if (corrVal !== undefined) {
                        yValues[i].push(corrVal*ampScale + offset)
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
            //;(this.$refs['container'] as any).on('plotly_hover', this.handleMouseHover)
            Plotly.relayout(this.$refs['container'], chartLayout)
        },
        updateViewStart: function () {
            const xPxRatio = this.resource.resolution/(this.pxPerHorizontalSquare*5)
            this.viewStart = (this.$refs['trace'] as HTMLDivElement).scrollLeft*xPxRatio
        },
    },
    mounted () {
        // Set left margin
        ;(this.$refs['trace'] as HTMLDivElement).style.marginLeft = `${this.marginLeft}px`
        // Calculate max width for the navigator as a reference
        this.navigatorMaxWidth = (this.resource.sampleCount/this.resource.resolution)*this.pxPerHorizontalSquare*5
        // Calculate view bounds
        this.viewEnd = this.getViewEnd()
        this.redrawPlot()
        // Bind event listeners
        ;(this.$refs['container'] as HTMLDivElement).addEventListener('mousedown', this.handleMouseDown)
        ;(this.$refs['container'] as HTMLDivElement).addEventListener('mouseup', this.handleMouseUp)
        ;(this.$refs['wrapper'] as HTMLDivElement).addEventListener('mouseout', this.handleMouseOut)
        // Set ruler scale
        const hSqr = this.pxPerHorizontalSquare
        const vSqr = this.pxPerVerticalSquare
        ;(document.querySelector('.medigi-viewer-ekg-mousedrag') as HTMLDivElement).style.backgroundSize
            = `${vSqr}px ${vSqr}px, ${hSqr}px ${hSqr}px, ${vSqr/5}px ${vSqr/5}px, ${hSqr/5}px ${hSqr/5}px`
        // Load navigator
        ;(this.$refs['navigator-overlay-left'] as HTMLDivElement).style.left = `${this.marginLeft}px`
        ;(this.$refs['navigator-overlay-left'] as HTMLDivElement)
            .addEventListener('click', this.handleNavigatorMouseClick)
        ;(this.$refs['navigator-overlay-active'] as HTMLDivElement)
            .addEventListener('mousedown', this.handleNavigatorMouseDown)
        ;(this.$refs['navigator-overlay-right'] as HTMLDivElement)
            .addEventListener('click', this.handleNavigatorMouseClick)
        this.redrawNavigator()
        this.refreshNavigatorOverlay()
    }
})
</script>

<style>
.medi-viewer-waveform-trace {
    overflow-x: auto;
}
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
.medigi-viewer-waveform-label {
    position: absolute;
    left: 0px;
    width: 40px;
    height: 20px;
    line-height: 20px;
    text-align: right;
}
.medigi-viewer-waveform-navigator {
    position: relative;
}
    .medigi-viewer-waveform-navigator-overlay-left {
        position: absolute;
        top: 20px;
        height: 50px;
        background-color: #FFFFFF;
        opacity: 0.75;
        cursor: default;
    }
    .medigi-viewer-waveform-navigator-overlay-active {
        position: absolute;
        top: 20px;
        height: 50px;
        background-color: #000000;
        opacity: 0.025;
        cursor: pointer;
        z-index: 1; /* In case the overlays overlap by 1px, prefer this one */
    }
    .medigi-viewer-waveform-navigator-overlay-right {
        position: absolute;
        top: 20px;
        right: 20px;
        height: 50px;
        background-color: #FFFFFF;
        opacity: 0.75;
        cursor: default;
    }
/* Do not allow adjusting the range */
.medigi-viewer-waveform-wrapper .rangeslider-grabber-min,
.medigi-viewer-waveform-wrapper .rangeslider-grabber-max {
    pointer-events: none !important;
}
</style>
