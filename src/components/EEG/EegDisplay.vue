<template>

    <div ref="wrapper" class="medimg-viewer-eeg-wrapper" @mouseleave="hideAnnotationMenu">
        <div ref="trace" class="medi-viewer-eeg-trace">
            <div ref="ylabels" class="medigi-viewer-eeg-ylabels"></div>
            <div ref="overlay" class="medigi-viewer-eeg-overlay"></div>
            <div ref="container" @contextmenu.prevent></div>
            <div ref="mousedrag" :class="[
                'medimg-viewer-eeg-mousedrag',
                { 'medimg-viewer-drag-active': mouseDragIndicator && !measurements },
                { 'medimg-viewer-hidden': !mouseDragIndicator },
            ]"></div>
            <div ref="measurements"
                :class="[
                    'medimg-viewer-eeg-measurements',
                    { 'medimg-viewer-hidden': !measurements }
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
        <!-- Video -->
        <div ref="video"
            :class="[
                'medimg-viewer-eeg-video',
                { 'medimg-viewer-hidden': !resource.video || !showVideo }
            ]"
        ></div>
        <!-- Navigator -->
        <div class="medimg-viewer-eeg-navigator">
            <div ref="navigator" @contextmenu.prevent></div>
            <div class="medimg-viewer-eeg-navigator-overlay-left" ref="navigator-overlay-left"></div>
            <div class="medimg-viewer-eeg-navigator-overlay-active" ref="navigator-overlay-active"></div>
            <div class="medimg-viewer-eeg-navigator-overlay-right" ref="navigator-overlay-right"></div>
        </div>
    </div>

</template>

<script lang="ts">
import Vue from 'vue'
// @ts-ignore: TSLint doesn't find the type definitions for Plotly.js, for some reason
import * as  Plotly from 'plotly'
import { WebglPlot, ColorRGBA, WebglLine } from 'webgl-plot'

let INSTANCE_NUM = 0
export default Vue.extend({
    props: {
        cmPerSec: Number,
        containerSize: Array,
        marginBottom: Number,
        marginLeft: Number,
        resource: Object, // SignalResource
        yPad: Number,
        uVperCm: Number,
    },
    data () {
        return {
            plotCanvas: null as null | HTMLCanvasElement,
            wglPlot: null as null | WebglPlot,
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
            viewEnd: 0,
            lastViewBounds: [0, 0],
            downSampleFactor: 1,
            navigatorMaxSamples: 1000,
            navigatorMaxWidth: 0,
            // Montages
            montages: [],
            activeMontage: 0,
            // Filters
            hpFilter: 0.5,
            lpFilter: 70,
            notchFilter: 0,
            // Keep track of some event data for chart interaction
            traceLeftPos: 0,
            keydownInterval: 0,
            keydownTimeout: 0,
            mouseDownPoint: { x: -1, y: -1 },
            mouseDownTrace: 0,
            // Don't start calculating next set of signals before last update has finished
            updatingPlot: false,
            // Display an indicator when mouse is dragged on the trace
            mouseDragIndicator: false,
            measurements: null as null | object,
            // Video properties
            showVideo: false,
            // Keep track of screen PPI changes
            lastPPI: this.$store.state.SETTINGS.screenPPI,
            unsubscribeSettings: null as any,
            // We need a way to uniquely identify this component instance's elements
            // from other iterations of the same resource
            instanceNum: INSTANCE_NUM++,
        }
    },
    watch: {
        containerSize (value: Array<number>, old: Array<number>) {
            this.resizeCanvas()
            this.redrawPlot()
            this.redrawNavigator()
        },
    },
    computed: {
        downscaledResolution (): number {
            return Math.floor(this.resource.maxSamplingRate/this.downSampleFactor)
        },
        filterRange (): { filter: number[], signal: number[] } {
            // Check for possible padding needed for signal filtering
            const ranges = {
                filter: [this.resource.viewStart, this.viewEnd],
                signal: [this.resource.viewStart, this.viewEnd],
            }
            if (this.lpFilter || this.hpFilter || this.notchFilter) {
                // Start cannot be below zero and end cannot exceed record length
                ranges.filter[0] = ranges.signal[0] - this.$store.state.SETTINGS.eeg.filterPadding
                ranges.filter[1] = ranges.signal[1] + this.$store.state.SETTINGS.eeg.filterPadding
            }
            return ranges
        },
        isAtEnd (): boolean {
            return (this.viewEnd >= this.resource.duration)
        },
        isRawSignals (): boolean {
            return (!this.resource.setup || !this.resource.activeMontage || this.resource.activeMontage.label === 'raw-signals')
        },
        mouseDragThreshold (): number {
            // Require at least two mm of mouse movement to register a drag event
            return this.$store.state.SETTINGS.screenPPI/17.7
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
            const step = this.navigatorMaxSamples/this.resource.duration
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
        pxPerMicroVolt (): number {
            return (this.$store.state.SETTINGS.screenPPI/2.54)/this.uVperCm
        },
        pxPerMinorGridline (): number {
            return Math.floor(((this.$store.state.SETTINGS.screenPPI/2.54)*this.cmPerSec)/5)
        },
        /**
         * The range that can accommodate the signal with the highest sampling rate accross the view range.
         */
        xAxisRange (): number {
            return this.viewEnd > this.resource.viewStart
                    ? Math.floor((this.viewEnd-this.resource.viewStart)*this.resource.maxSamplingRate)
                    : 0
        },
        xAxisTicks (): number[] {
            const range = this.viewEnd - this.resource.viewStart
            const ticks = []
            for (let i=0; i<range; i++) {
                ticks.push((i - this.resource.viewStart%1)*this.downscaledResolution)
            }
            return ticks
        },
        xAxis2Ticks (): number[] {
            const range = this.viewEnd - this.resource.viewStart
            const ticks = []
            for (let i=0; i<range; i++) {
                ticks.push(
                    (i + 1/5 - this.resource.viewStart%1)*this.downscaledResolution,
                    (i + 2/5 - this.resource.viewStart%1)*this.downscaledResolution,
                    (i + 3/5 - this.resource.viewStart%1)*this.downscaledResolution,
                    (i + 4/5 - this.resource.viewStart%1)*this.downscaledResolution,
                )
            }
            return ticks
        },
        xAxisValues (): string[] {
            const values = []
            for (let i=0; i<this.xAxisTicks.length; i++) {
                // Print empty labels at minor grid lines
                if (!i) {
                    values.push('')
                    continue
                }
                let point = Math.floor(this.resource.viewStart) + i
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
        yAxisRange (): number {
            return (this.containerSize[1] as number) - this.marginBottom
        },
        yAxisTicks (): number[] {
            const ticks = []
            if (this.isRawSignals) {
                // No setup, so all channels are spaced evenly
                for (let i=0; i<this.resource.channels.length; i++) {
                    ticks.push(1.0 - ((i + 1)/(this.resource.channels.length + 1)))
                }
            } else {
                // Get trace spacing from montage
                for (let i=0; i<this.resource.activeMontage.channels.length; i++) {
                    ticks.push(this.resource.activeMontage.channels[i].offset)
                }
            }
            return ticks
        },
        yAxisValues (): string[] {
            const values = []
            for (const chan of !this.isRawSignals ? this.resource.activeMontage.channels : this.resource.channels) {
                values.push(chan.name)
            }
            return values
        },
    },
    methods: {
        /** Shorthand for component-specific translations */
        t: function (str: string, args?: any) {
            if (args) {
                return this.$t(`components.EEG.EegDisplay.${str}`, args)
            } else {
                return (this.$t('components.EEG.EegDisplay') as any)[str]
            }
        },
        calculateMontageSignals: function () {
        },
        getChannelLabel: function (index: number): string {
            // TODO: Some kind of checking needed to make sure the right label is returned?
            // Fallback: just return the label
            return this.resource.channels[index].name
        },
        getViewEnd: function (clip=false): number  {
            // Calculate the chart's left and right margins
            const viewWidth: number = this.containerSize[0] as number - this.marginLeft
                                      - this.$store.state.SETTINGS.eeg.border.left.width
            const newWidth = viewWidth/(this.pxPerMinorGridline*5)/this.downSampleFactor
            return this.resource.viewStart + newWidth
        },
        handleKeydown: function (event: KeyboardEvent) {
            if (event.key === 'PageUp') {
                event.preventDefault()
                if (this.keydownTimeout || this.keydownInterval) {
                    return
                }
                this.keydownTimeout = window.setTimeout(() => {
                    this.keydownTimeout = 0
                    this.previousPage()
                    this.keydownInterval = window.setInterval(() => {
                        this.previousPage()
                    }, this.$store.state.SETTINGS.eeg.continuousBrowseInterval)
                }, this.$store.state.SETTINGS.eeg.continuousBrowseDelay)
            } else if (event.key === 'PageDown') {
                event.preventDefault()
                if (this.keydownTimeout || this.keydownInterval) {
                    return
                }
                this.keydownTimeout = window.setTimeout(() => {
                    this.keydownTimeout = 0
                    this.nextPage()
                    this.keydownInterval = window.setInterval(() => {
                        this.nextPage()
                    }, this.$store.state.SETTINGS.eeg.continuousBrowseInterval)
                }, this.$store.state.SETTINGS.eeg.continuousBrowseDelay)
            }
        },
        handleKeyup: function (event: KeyboardEvent) {
            if (event.key === 'PageUp') {
                event.preventDefault()
                if (this.keydownTimeout) {
                    window.clearTimeout(this.keydownTimeout)
                    this.keydownTimeout = 0
                    this.previousPage()
                } else if (this.keydownInterval) {
                    window.clearInterval(this.keydownInterval)
                    this.keydownInterval = 0
                }
            } else if (event.key === 'PageDown') {
                event.preventDefault()
                if (this.keydownTimeout) {
                    window.clearTimeout(this.keydownTimeout)
                    this.keydownTimeout = 0
                    this.nextPage()
                } else if (this.keydownInterval) {
                    window.clearInterval(this.keydownInterval)
                    this.keydownInterval = 0
                }
            }
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
            /*
            if (this.mouseDownPoint.x < 0 || this.mouseDownPoint.y < 0) {
                return
            }
            const wrapperPos = (this.$refs['wrapper'] as HTMLDivElement).getBoundingClientRect()
            // If no tool is active, use drag to scroll the trace
            if (!this.$store.state.activeTool) {
                // No need to scroll if the entire trace is already visible
                if (this.resource.viewStart === 0 && this.getViewEnd(true) >= this.resource.sampleCount/this.downSampleFactor) {
                    return
                }
                const dX = e.clientX - this.mouseDownPoint.x
                ;(this.$refs['trace'] as HTMLDivElement).scrollLeft = this.traceLeftPos - dX
                this.updateViewStart()
                this.refreshNavigatorOverlay()
            } else if (this.$store.state.activeTool === 'measure') {
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
                        const yOffset = this.$store.state.showEkgRuler ? 1 : 0
                        const top = startPos + this.mouseDownTrace*traceHeight - yOffset
                        dragEl.style.top = top > 0 ? `${top}px` : '0px'
                        dragEl.style.height = `${traceHeight + yOffset}px`
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
                    //this.lastHoverPoint = {
                    //    x: e.offsetX - wrapperPos.left,
                    //    y: e.offsetY - wrapperPos.top
                    //}
                }
            }
            */
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
            /*
            // Check if we have a drag selection
            if (this.mouseDragIndicator) {
                if (this.mouseDownPoint.x >= 0) {
                    // Handle drag selection
                    if (this.$store.state.activeTool === 'measure' && !this.measurements) {
                        const wrapperPos = (this.$refs['wrapper'] as HTMLDivElement).getBoundingClientRect()
                        // Horizontal paper scale; standard is 1 cm per 2 squares and 2.5cm per sec
                        const scaleF = (this.cmPerSec/2.5)/2
                        // Signal datapoints per second
                        const ptsPerSec = this.resource.maxSamplingRate/this.cmPerSec
                        // Start position (datapoint)
                        const startX = this.mouseDownPoint.x - this.marginLeft
                        const startPos = Math.round((scaleF*startX/this.pxPerHorizontalSquare)*ptsPerSec)
                        const endX = e.offsetX - wrapperPos.left - this.marginLeft
                        // End position
                        const endPos = Math.round((scaleF*endX/this.pxPerHorizontalSquare)*ptsPerSec)
                        // Use default 0 amplitude if start or end is outside the trace bounds
                        const startAmp = this.getCorrectedSignalValue(this.mouseDownTrace + this.firstTraceIndex, startPos)
                        //startPos >= 0 && startPos <= this.resource.sampleCount
                        //                 ? this.resource.channels[this.mouseDownTrace + this.firstTraceIndex].signals[startPos] : 0
                        const endAmp = this.getCorrectedSignalValue(this.mouseDownTrace + this.firstTraceIndex, endPos)
                        //endPos >= 0 && endPos <= this.resource.sampleCount
                        //               ? this.resource.channels[this.mouseDownTrace + this.firstTraceIndex].signals[endPos] : 0
                        this.measurements = {
                            distance: Math.round(((endPos - startPos)/this.resource.maxSamplingRate)*1000),
                            amplitude: Math.round((endAmp || 0) - (startAmp || 0)),
                        }
                        ;(this.$refs['measurements'] as HTMLDivElement).style.top = `${e.y - wrapperPos.top}px`
                        ;(this.$refs['measurements'] as HTMLDivElement).style.left = `${e.x - wrapperPos.left}px`
                    }
                }
            }
            */
            this.mouseDownPoint = { x: -1, y: -1 }
        },
        hideAnnotationMenu: function () {

        },
        nextPage: function () {
            let stepLength = 10 // Ten seconds per step
            // Browse right
            // Do not exceed the end of the recording
            if (this.isAtEnd || this.updatingPlot) {
                return
            }
            this.resource.viewStart += stepLength
            this.viewEnd += stepLength
            this.refreshTraces()
            if (this.isAtEnd) {
                this.$emit('at-end', true)
            }
            if (this.resource.viewStart) {
                this.$emit('at-start', false)
            }
        },
        previousPage: function () {
            let stepLength = 10
            // Browse left
            // Do not backtrack beyound the start of the recording
            if (!this.resource.viewStart || this.updatingPlot) {
                return
            }
            if (this.resource.viewStart - stepLength < 0) {
                stepLength = this.resource.viewStart
            }
            this.resource.viewStart -= stepLength
            this.viewEnd -= stepLength
            this.refreshTraces()
            if (!this.resource.viewStart) {
                this.$emit('at-start', true)
            }
            if (!this.isAtEnd) {
                // TODO: Do not emit this every time
                this.$emit('at-end', false)
            }
        },
        recalibrateChart: function (force=false) {
            this.viewEnd = this.getViewEnd()
            this.refreshNavigatorOverlay()
            // Redrawing the plot is slow, so only do it if necessary
            if (this.resource.viewStart === this.lastViewBounds[0] && this.viewEnd === this.lastViewBounds[1]) {
                if (!force) {
                    return
                }
            } else {
                this.lastViewBounds = [this.resource.viewStart, this.viewEnd]
            }
            // Update chart dimensions and the y-axis (x-axis is updated in refreshTraces method)
            this.resizeCanvas()
            this.redrawPlot()
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
            if (!this.plotCanvas) {
                return
            }
            this.updatingPlot = true
            this.wglPlot = new WebglPlot(this.plotCanvas)
            this.wglPlot?.removeAllLines()
            const channels = this.isRawSignals ? this.resource.channels : this.resource.activeMontage.channels
            // Add montage channels
            for (const chan of channels) {
                if (chan.active === null) {
                    // Don't add empty channels
                    continue
                }
                const typeC = this.$store.state.SETTINGS.eeg.traceColor[chan.type]
                const defC = this.$store.state.SETTINGS.eeg.traceColor.default
                const color = typeC ? new ColorRGBA(typeC[0], typeC[1], typeC[2], typeC[3])
                                    : new ColorRGBA(defC[0], defC[1], defC[2], defC[3])
                const range = this.xAxisRange/this.downSampleFactor
                const line = new WebglLine(color, Math.floor(range))
                line.lineSpaceX(-1, 2 / Math.floor(range))
                this.wglPlot?.addLine(line)
            }
            // Update channel labels
            const borderLStyle = this.$store.state.SETTINGS.eeg.border.left.style
            const borderLWidth = this.$store.state.SETTINGS.eeg.border.left.width
            const borderLColor = this.$store.state.SETTINGS.eeg.border.left.color
            const borderBStyle = this.$store.state.SETTINGS.eeg.border.bottom.style
            const borderBWidth = this.$store.state.SETTINGS.eeg.border.bottom.width
            const borderBColor = this.$store.state.SETTINGS.eeg.border.bottom.color
            const totalOffsetB = this.navigatorConfig.height + this.marginBottom + borderBWidth
            ;(this.$refs['ylabels'] as HTMLDivElement).style.bottom = `${totalOffsetB}px`
            ;(this.$refs['ylabels'] as HTMLDivElement).style.width = `${this.marginLeft}px`
            // Assign new trace labels
            while ((this.$refs['ylabels'] as HTMLDivElement).firstChild) {
                (this.$refs['ylabels'] as HTMLDivElement).removeChild((this.$refs['ylabels'] as HTMLDivElement).lastChild as Node)
            }
            const montChannels = this.isRawSignals ? this.resource.channels : this.resource.activeMontage.channels
            let i = 0
            for (const chan of montChannels) {
                if (chan.active === null) {
                    continue
                }
                const offset = this.isRawSignals ? (1.0 - ((i + 1)/(montChannels.length + 1))) : chan.offset
                const label = document.createElement('div')
                label.style.top = `calc(${(1 - offset)*100}% - 10px)`
                label.innerText = chan.name
                label.title = chan.name
                ;(this.$refs['ylabels'] as HTMLDivElement).appendChild(label)
                i++
            }
            // Update the overlay
            const majColor = this.$store.state.SETTINGS.eeg.majorGrid.color
            const minColor = this.$store.state.SETTINGS.eeg.minorGrid.color
            const majWidth = this.$store.state.SETTINGS.eeg.majorGrid.width
            const majSpace = this.pxPerMinorGridline*5 - majWidth
            const bgStyle = `repeating-linear-gradient(90deg,
                transparent 0 ${majSpace}px,
                ${majColor} ${majSpace}px ${majSpace + majWidth}px)
            `
            ;(this.$refs['overlay'] as HTMLDivElement).style.left = `${this.marginLeft}px`
            ;(this.$refs['overlay'] as HTMLDivElement).style.bottom = `${totalOffsetB}px`
            ;(this.$refs['overlay'] as HTMLDivElement).style.borderLeft = `${borderLStyle} ${borderLWidth}px ${borderLColor}`
            ;(this.$refs['overlay'] as HTMLDivElement).style.borderBottom = `${borderBStyle} ${borderBWidth}px ${borderBColor}`
            ;(this.$refs['overlay'] as HTMLDivElement).style.backgroundImage = bgStyle
            this.refreshTraces()
        },
        refreshNavigator: function () {
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
                    tickvals: [],
                    ticktext: [],
                }),
            }
            Plotly.relayout(this.$refs['navigator'], naviLayout)
        },
        refreshNavigatorOverlay: function () {
            const viewEnd = this.getViewEnd(true)
            const naviTrueWidth = (this.$refs['navigator'] as HTMLDivElement).offsetWidth - this.marginLeft - 20
            const naviWidth = naviTrueWidth < this.navigatorMaxWidth ? naviTrueWidth : this.navigatorMaxWidth
            if (this.resource.viewStart === 0 && viewEnd >= this.resource.sampleCount/this.downSampleFactor) {
                ;(this.$refs['navigator-overlay-left'] as HTMLDivElement).style.width = `0px`
                ;(this.$refs['navigator-overlay-active'] as HTMLDivElement).style.left = `${this.marginLeft}px`
                ;(this.$refs['navigator-overlay-active'] as HTMLDivElement).style.width = `${naviWidth}px`
                ;(this.$refs['navigator-overlay-right'] as HTMLDivElement).style.width = `0px`
                return
            }
            const leftWidth = (this.resource.viewStart/this.resource.sampleCount)*naviWidth
            const actWidth = ((viewEnd - this.resource.viewStart)/this.resource.sampleCount)*naviWidth
            const rightWidth = ((this.resource.sampleCount - viewEnd)/this.resource.sampleCount)*naviWidth
            ;(this.$refs['navigator-overlay-left'] as HTMLDivElement).style.width = `${leftWidth}px`
            ;(this.$refs['navigator-overlay-active'] as HTMLDivElement).style.left = `${leftWidth + this.marginLeft}px`
            ;(this.$refs['navigator-overlay-active'] as HTMLDivElement).style.width = `${actWidth}px`
            ;(this.$refs['navigator-overlay-right'] as HTMLDivElement).style.width = `${rightWidth}px`
        },
        refreshTraces: function () {
            if (!this.updatingPlot) {
                this.updatingPlot = true
            }
            // Y-axis values for each channel
            const ampScale = this.pxPerMicroVolt/this.yAxisRange // Relative height of one microvolt
            const range = this.filterRange.signal
            const config = { filterPadding: this.$store.state.SETTINGS.eeg.filterPadding }
            const signals = this.resource.getAllMontageSignals(range, config)
            const montChans = this.isRawSignals ? this.resource.channels : this.resource.activeMontage.channels
            let i = 0
            datalineloop:
            for (const line of this.wglPlot?.linesData || []) {
                while (montChans[i].active === null) {
                    // WebGL-Plot doesn't handle empty signals well, so skip those
                    i++
                    if (i === montChans.length || i === signals.length) {
                        break datalineloop
                    }
                }
                const offset = this.isRawSignals ? (1.0 - ((i + 1)/(signals.length + 1)))*2 - 1
                               : montChans[i].offset*2 - 1
                const sigAmp = this.$store.state.SETTINGS.eeg.signalAmplitude
                const sigPol = this.$store.state.SETTINGS.eeg.signalPolarity
                let k = 0
                for (let j=0; j<signals[i].length; j++) {
                    if (j%this.downSampleFactor) {
                        continue
                    }
                    ;(line as WebglLine).setY(k, (signals[i][j] || 0)*ampScale*sigAmp*sigPol + offset)
                    k++
                }
                i++
            }
            this.$nextTick(() => {
                this.updatingPlot = false
            })
        },
        resizeCanvas: function () {
            if (!this.plotCanvas) {
                return
            }
            const bbWidth = this.$store.state.SETTINGS.eeg.border.bottom.width
            const lbWidth = this.$store.state.SETTINGS.eeg.border.left.width
            const width = this.containerSize[0] as number - this.marginLeft - lbWidth
            const height = this.containerSize[1] as number - this.navigatorConfig.height - bbWidth
            ;(this.plotCanvas as any).width = width
            ;(this.plotCanvas as any).height = height
            this.plotCanvas.style.width = `${width}px`
            this.plotCanvas.style.height = `${height}px`
            this.plotCanvas.style.marginLeft = `${this.marginLeft + lbWidth}px`
        },
        updateViewStart: function () {
            const xPxRatio = this.resource.maxSamplingRate/(this.pxPerMinorGridline*5)
            this.resource.viewStart = (this.$refs['trace'] as HTMLDivElement).scrollLeft*xPxRatio
        },
    },
    mounted () {
        // Create canvas for the plot
        this.plotCanvas = document.createElement("canvas")
        ;(this.$refs['container'] as HTMLDivElement).appendChild(this.plotCanvas)
        this.resizeCanvas()
        // Calculate max width for the navigator as a reference
        this.navigatorMaxWidth = this.resource.duration*this.pxPerMinorGridline*5
        // Apply initial settings to montages
        this.resource.setHighpassFilter('eeg', this.hpFilter)
        this.resource.setLowpassFilter('eeg', this.lpFilter)
        this.resource.setNotchFilter('eeg', this.notchFilter)
        // Calculate view bounds
        this.viewEnd = this.getViewEnd()
        this.redrawPlot()
        // Bind event listeners
        ;(this.$refs['container'] as HTMLDivElement).addEventListener('mousedown', this.handleMouseDown)
        ;(this.$refs['container'] as HTMLDivElement).addEventListener('mouseup', this.handleMouseUp)
        ;(this.$refs['wrapper'] as HTMLDivElement).addEventListener('mouseout', this.handleMouseOut)
        window.addEventListener('keydown', this.handleKeydown, false)
        window.addEventListener('keyup', this.handleKeyup, false)
        // Load navigator
        ;(this.$refs['navigator-overlay-left'] as HTMLDivElement).style.left = `${this.marginLeft}px`
        this.redrawNavigator()
        this.refreshNavigatorOverlay()
        // Redraw plot if screen PPI changes
        this.unsubscribeSettings = this.$store.subscribe((mutation) => {
            // Monitor PPI setting changes.
            // Redrawing the plot is slow so only update the value when settings menu is closed.
            if (mutation.type === 'toggle-settings' && !this.$store.state.settingsOpen
                && this.$store.state.SETTINGS.screenPPI !== this.lastPPI
            ) {
                this.lastPPI = this.$store.state.SETTINGS.screenPPI
                this.redrawPlot()
            } else if (mutation.type === 'set-settings-value' && mutation.payload.field.split('.')[0] == 'eeg') {
                this.refreshTraces()
            }
        })
        // Start animation frame request loop
        const newFrame = () => {
            this.wglPlot?.update()
            requestAnimationFrame(newFrame)
        }
        requestAnimationFrame(newFrame)
        // Emit navigation position
        this.$emit('at-start', this.resource.viewStart === 0)
        this.$emit('at-end', this.isAtEnd)
    },
    beforeDestroy () {
        window.removeEventListener('keydown', this.handleKeydown, false)
        window.removeEventListener('keyup', this.handleKeyup, false)
        if (this.keydownInterval) {
            window.clearInterval(this.keydownInterval)
            this.keydownInterval = 0
        }
        if (this.unsubscribeSettings !== null) {
            this.unsubscribeSettings()
        }
        this.$emit('destroyed')
    },
})
</script>

<style>
.medimg-viewer-eeg-wrapper {
    position: relative;
    float: left;
}
.medimg-viewer-eeg-ylabels {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 100;
}
    .medimg-viewer-eeg-ylabels > div {
        position: absolute;
        right: 0;
        width: 100%;
        height: 24px;
        line-height: 24px;
        padding-right: 10px;
        text-align: right;
        overflow: hidden;
        white-space: nowrap;
    }
.medimg-viewer-eeg-overlay {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 100;
}
.medimg-viewer-eeg-mousedrag {
    position: absolute;
    background-color: rgba(255, 0, 0, 0.2);
    pointer-events: none;
    opacity: 0.5;
}
    .medimg-viewer-eeg-mousedrag:not(.medimg-viewer-ekg-ruler).medimg-viewer-drag-active {
        background-color: rgba(255, 0, 0, 0.1);
        border-left: solid 1px var(--medimg-viewer-border);
        border-right: solid 1px var(--medimg-viewer-border);
        opacity: 1;
    }
.medimg-viewer-eeg-measurements {
    position: absolute;
    background-color: var(--medimg-viewer-background-emphasize);
    padding: 6px 10px;
    border: solid 1px var(--medimg-viewer-border);
    pointer-events: none;
}
    .medimg-viewer-eeg-measurements > div > span {
        display: inline-block;
        height: 24px;
        line-height: 24px;
    }
    .medimg-viewer-eeg-measurements > div > span:nth-child(1) {
        width: 80px;
    }
.medimg-viewer-eeg-navigator {
    position: relative;
}
    .medimg-viewer-eeg-navigator-overlay-left {
        position: absolute;
        top: 20px;
        height: 50px;
        background-color: #FFFFFF;
        opacity: 0.75;
        pointer-events: none;
        cursor: default;
    }
    .medimg-viewer-eeg-navigator-overlay-active {
        position: absolute;
        top: 20px;
        height: 50px;
        background-color: #000000;
        opacity: 0.025;
        cursor: pointer;
    }
    .medimg-viewer-eeg-navigator-overlay-right {
        position: absolute;
        top: 20px;
        right: 20px;
        height: 50px;
        background-color: #FFFFFF;
        opacity: 0.75;
        pointer-events: none;
        cursor: default;
    }
/* Do not allow adjusting the range */
.medimg-viewer-eeg-wrapper .rangeslider-grabber-min,
.medimg-viewer-eeg-wrapper .rangeslider-grabber-max {
    pointer-events: none !important;
}
</style>
