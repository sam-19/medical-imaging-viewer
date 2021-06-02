<template>

    <div ref="wrapper" class="medigi-viewer-waveform-wrapper" @mouseleave="hideAnnotationMenu">
        <div ref="trace" class="medi-viewer-waveform-trace">
            <div ref="container" @contextmenu.prevent></div>
            <div ref="mousedrag" :class="[
                'medigi-viewer-ekg-mousedrag',
                { 'medigi-viewer-drag-active': mouseDragIndicator && !measurements },
                { 'medigi-viewer-hidden': !mouseDragIndicator },
                { 'medigi-viewer-ekg-ruler': $store.state.showEkgRuler },
            ]"></div>
            <div ref="measurements"
                :class="[
                    'medigi-viewer-ekg-measurements',
                    { 'medigi-viewer-hidden': !measurements }
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
            chart: null as any,
            chartConfig: {
                // Props are initialized before data
                width: 0,
                margin: { t: 0, r: 0, b: this.marginBottom, l: this.marginLeft },
                showlegend: false,
                dragmode: false,
                xaxis: {
                    tickmode: 'array',
                    ticklen: 5, // This serves as padding between axis and label
                    tickcolor: 'rgba(0,0,0,0)',
                    rangemode: 'tozero',
                    gridcolor: this.$store.state.SETTINGS.eeg.majorGrid.show
                               ? this.$store.state.SETTINGS.eeg.majorGrid.color : 'rgba(0,0,0,0)',
                    gridwidth: this.$store.state.SETTINGS.eeg.majorGrid.show
                               ? this.$store.state.SETTINGS.eeg.majorGridLineWidth : 0,
                    zerolinecolor: this.$store.state.SETTINGS.eeg.leftBorder.color || 'rgba(0,0,0,0)',
                    zerolinewidth: this.$store.state.SETTINGS.eeg.leftBorder.width || 0,
                    overlaying: 'x2',
                    fixedrange: true,
                },
                xaxis2: {
                    tickmode: 'array',
                    rangemode: 'tozero',
                    gridcolor: this.$store.state.SETTINGS.eeg.minorGrid.show
                               ? this.$store.state.SETTINGS.eeg.minorGrid.color : 'rgba(0,0,0,0)',
                    gridwidth: this.$store.state.SETTINGS.eeg.minorGrid.show
                               ? this.$store.state.SETTINGS.eeg.minorGrid.width : 0,
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
                    gridcolor: this.$store.state.SETTINGS.eeg.isoelLine.show
                               ? this.$store.state.SETTINGS.eeg.isoelLine.color : 'rgba(0,0,0,0)',
                    gridwidth: this.$store.state.SETTINGS.eeg.isoelLine.show
                               ? this.$store.state.SETTINGS.eeg.isoelLine.width : 0,
                    zerolinecolor: this.$store.state.SETTINGS.eeg.bottomBorder.color || 'rgba(0,0,0,0)',
                    zerolinewidth: this.$store.state.SETTINGS.eeg.bottomBorder.width || 0,
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
            // Montages
            montages: [],
            activeMontage: 0,
            // Filters
            hpFilter: 0,
            lpFilter: 0,
            notchFilter: 0,
            // Keep track of some event data for chart interaction
            //lastHoverPoint: { x: -1, y: -1 },
            traceLeftPos: 0,
            mouseDownPoint: { x: -1, y: -1 },
            mouseDownTrace: 0,
            // Display an indicator when mouse is dragged on the trace
            mouseDragIndicator: false,
            measurements: null as null | object,
            // Keep track of screen PPI changes
            lastPPI: this.$store.state.SETTINGS.screenPPI,
            settingsUnsub: null as any,
            // We need a way to uniquely identify this component instance's elements
            // from other iterations of the same resource
            instanceNum: INSTANCE_NUM++,
        }
    },
    watch: {
    },
    computed: {
        downscaledResolution (): number {
            return Math.floor(this.resource.maxSamplingRate/this.downSampleFactor)
        },
        channelSignals (): any[] {
            const signals: any[] = []
            for (let i=0; i<this.resource.channels.length; i++) {
                const chanLabel: string = this.resource.channels[i].label
                const traceColor = this.resource.channels[i].type === 'ekg'
                    ? this.$store.state.SETTINGS.eeg.traceColor.ekg
                    : this.resource.channels[i].type === 'eog'
                    ? this.$store.state.SETTINGS.eeg.traceColor.eog
                    : this.$store.state.SETTINGS.eeg.traceColor.eeg // Default to EEG
                const traceWidth = this.resource.channels[i].type === 'ekg'
                    ? this.$store.state.SETTINGS.eeg.traceWidth.ekg
                    : this.resource.channels[i].type === 'eog'
                    ? this.$store.state.SETTINGS.eeg.traceWidth.eog
                    : this.$store.state.SETTINGS.eeg.traceWidth.eeg
                // Wrap it into an object
                signals[i] = {
                    name: chanLabel,
                    type: 'scattergl',
                    mode: 'lines',
                    connectgaps: true,
                    x: this.xAxisRange,
                    y: [],
                    line: {
                        color: traceColor,
                        width: traceWidth
                    },
                    hoverinfo: 'none',
                }
            }
            if (this.$store.state.SETTINGS.eeg.minorGrid.show) {
                // Add something to x2 to show minor gridlines
                signals.push({
                    name: '',
                    x: this.xAxisRange,
                    y: [],
                    xaxis: 'x2',
                    line: { color: 'rgba(0,0,0,0)', width: 0 },
                    hoverinfo: 'none',
                })
            }
            return signals
        },
        filterRange (): { filter: number[], signal: number[] } {
            // Check for possible padding needed for signal filtering
            const ranges = {
                filter: [this.viewStart, this.viewEnd],
                signal: [this.viewStart, this.viewEnd],
            }
            if (this.lpFilter || this.hpFilter || this.notchFilter) {
                // Start cannot be below zero and end cannot exceed record length
                ranges.filter[0] = ranges.signal[0] > this.$store.state.SETTINGS.eeg.filterPad
                                   ? ranges.signal[0] - this.$store.state.SETTINGS.eeg.filterPad : 0
                ranges.filter[1] = ranges.signal[1] + this.$store.state.SETTINGS.eeg.filterPad < this.resource.duration
                                 ? ranges.signal[1] + this.$store.state.SETTINGS.eeg.filterPad : this.resource.duration
            }
            return ranges
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
        xAxisRange (): number[] {
            return this.viewEnd > this.viewStart
                    ? [...Array(Math.floor((this.viewEnd-this.viewStart)*this.resource.maxSamplingRate)).keys()]
                    : []
        },
        xAxisTicks (): number[] {
            const range = this.viewEnd - this.viewStart
            const ticks = []
            for (let i=0; i<range; i++) {
                ticks.push((i - this.viewStart%1)*this.downscaledResolution)
            }
            return ticks
        },
        xAxis2Ticks (): number[] {
            const range = this.viewEnd - this.viewStart
            const ticks = []
            for (let i=0; i<range; i++) {
                ticks.push(
                    (i + 1/5 - this.viewStart%1)*this.downscaledResolution,
                    (i + 2/5 - this.viewStart%1)*this.downscaledResolution,
                    (i + 3/5 - this.viewStart%1)*this.downscaledResolution,
                    (i + 4/5 - this.viewStart%1)*this.downscaledResolution,
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
                let point = Math.floor(this.viewStart) + i
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
            if (!this.resource.setup) {
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
            for (const chan of this.resource.setup ? this.resource.activeMontage.channels : this.resource.channels) {
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
            const newWidth = viewWidth/(this.pxPerMinorGridline*5)/this.downSampleFactor
            return this.viewStart + newWidth
        },
        handleKeypress: function (event: KeyboardEvent) {
            let stepLength = 10 // Ten seconds per step
            if (event.key === 'PageUp') {
                // Browse left
                if (this.viewStart) {
                    // Do not backtrack beyound the start of the recording
                    if (this.viewStart - stepLength < 0) {
                        stepLength = this.viewStart
                    }
                    this.viewStart -= stepLength
                    this.viewEnd -= stepLength
                }
                event.preventDefault()
                this.refreshTraces()
            } else if (event.key === 'PageDown') {
                // Browse right
                // Do not exceed the end of the recording
                if (this.viewEnd >= this.resource.duration) {
                    return
                }
                this.viewStart += stepLength
                this.viewEnd += stepLength
                event.preventDefault()
                this.refreshTraces()
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
                if (this.viewStart === 0 && this.getViewEnd(true) >= this.resource.sampleCount/this.downSampleFactor) {
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
            const chartLayout = {
                width: this.containerSize[0],
                height: this.containerSize[1],
                yaxis: Object.assign({}, this.chartConfig.yaxis, {
                    range: [0, 1],
                    tickvals: this.yAxisTicks,
                    ticktext: this.yAxisValues,
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
            if (this.viewStart === 0 && viewEnd >= this.resource.sampleCount/this.downSampleFactor) {
                ;(this.$refs['navigator-overlay-left'] as HTMLDivElement).style.width = `0px`
                ;(this.$refs['navigator-overlay-active'] as HTMLDivElement).style.left = `${this.marginLeft}px`
                ;(this.$refs['navigator-overlay-active'] as HTMLDivElement).style.width = `${naviWidth}px`
                ;(this.$refs['navigator-overlay-right'] as HTMLDivElement).style.width = `0px`
                return
            }
            const leftWidth = (this.viewStart/this.resource.sampleCount)*naviWidth
            const actWidth = ((viewEnd - this.viewStart)/this.resource.sampleCount)*naviWidth
            const rightWidth = ((this.resource.sampleCount - viewEnd)/this.resource.sampleCount)*naviWidth
            ;(this.$refs['navigator-overlay-left'] as HTMLDivElement).style.width = `${leftWidth}px`
            ;(this.$refs['navigator-overlay-active'] as HTMLDivElement).style.left = `${leftWidth + this.marginLeft}px`
            ;(this.$refs['navigator-overlay-active'] as HTMLDivElement).style.width = `${actWidth}px`
            ;(this.$refs['navigator-overlay-right'] as HTMLDivElement).style.width = `${rightWidth}px`
        },
        refreshTraces: function () {
            // Y-axis values for each channel
            const yValues = []
            const ampScale = this.pxPerMicroVolt/this.yAxisRange // Relative height of one microvolt
            const range = this.filterRange
            const channels = this.resource.getAllMontageSignals(range.filter)
            for (let i=0; i<channels.length; i++) {
                const start = Math.floor((range.signal[0] - range.filter[0])*this.resource.maxSamplingRate*this.downSampleFactor)
                const end = Math.floor((range.signal[1] - range.signal[0])*this.resource.maxSamplingRate*this.downSampleFactor)
                let offset, resFactor
                if (!this.resource.setup) {
                    // If no setup is loaded, display the raw signals
                    offset = 1.0 - ((i + 1)/(channels.length + 1))
                    resFactor = this.resource.maxSamplingRate/this.resource.channels[i].samplingRate
                } else {
                    // Display montage signals
                    offset = this.resource.activeMontage.channels[i].offset
                    resFactor = this.resource.maxSamplingRate/this.resource.activeMontage.channels[i].samplingRate
                }
                yValues[i] = [] as (number|null)[]
                // Start by checking if there is a preceding (out of sight) value and intrapolate the first visible value from it
                if (start%resFactor) {
                    const startFloor = channels[i].splice(0, 1)
                    const startCeil = channels[i][0]
                    const startFactor = (start%resFactor)/resFactor
                    const startValue = startFloor + (startCeil - startFloor)*(startFactor)
                    yValues[i][0] = startValue
                }
                for (let j=start; j<end; j++) {
                    if (j%this.downSampleFactor || !j && yValues[i].length) {
                        continue
                    }
                    if (j%resFactor) {
                        yValues[i][j] = null
                    } else {
                        const idx = Math.floor(j/resFactor)
                        yValues[i][j] = ((channels[i][idx] || 0)*ampScale + offset)
                    }
                }
                // Last, check if there is an additional datapoint left over and intrapolate view end from it
                if (channels[i][Math.ceil(end/resFactor)] !== undefined && yValues[i][yValues[i].length - 1] === null) {
                    const endFloor = Math.floor(end/resFactor)
                    const endCeil = Math.ceil(end/resFactor)
                    const endFactor = (end%resFactor)/resFactor
                    const endValue = channels[i][endFloor] + (channels[i][endCeil] - channels[i][endFloor])*(endFactor)
                    yValues[i][yValues[i].length - 1] = endValue*ampScale + offset
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
            const xPxRatio = this.resource.maxSamplingRate/(this.pxPerMinorGridline*5)
            this.viewStart = (this.$refs['trace'] as HTMLDivElement).scrollLeft*xPxRatio
        },
    },
    mounted () {
        // Calculate max width for the navigator as a reference
        this.navigatorMaxWidth = this.resource.duration*this.pxPerMinorGridline*5
        // Calculate view bounds
        this.viewEnd = this.getViewEnd()
        this.redrawPlot()
        // Bind event listeners
        ;(this.$refs['container'] as HTMLDivElement).addEventListener('mousedown', this.handleMouseDown)
        ;(this.$refs['container'] as HTMLDivElement).addEventListener('mouseup', this.handleMouseUp)
        ;(this.$refs['wrapper'] as HTMLDivElement).addEventListener('mouseout', this.handleMouseOut)
        window.addEventListener('keydown', this.handleKeypress, false)
        // Load navigator
        ;(this.$refs['navigator-overlay-left'] as HTMLDivElement).style.left = `${this.marginLeft}px`
        this.redrawNavigator()
        this.refreshNavigatorOverlay()
        // Redraw plot if screen PPI changes
        this.settingsUnsub = this.$store.subscribeAction((action: any) => {
            // Monitor PPI setting changes.
            // Redrawing the plot is slow so only update the value when settings menu is closed.
            if (action.type === 'settings:closed' && this.$store.state.SETTINGS.screenPPI !== this.lastPPI) {
                this.lastPPI = this.$store.state.SETTINGS.screenPPI
                this.redrawPlot()
            }
        })
    },
    beforeDestroy () {
        window.removeEventListener('keydown', this.handleKeypress, false)
        if (this.settingsUnsub !== null) {
            this.settingsUnsub()
        }
    },
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
.medigi-viewer-waveform-navigator {
    position: relative;
}
    .medigi-viewer-waveform-navigator-overlay-left {
        position: absolute;
        top: 20px;
        height: 50px;
        background-color: #FFFFFF;
        opacity: 0.75;
        pointer-events: none;
        cursor: default;
    }
    .medigi-viewer-waveform-navigator-overlay-active {
        position: absolute;
        top: 20px;
        height: 50px;
        background-color: #000000;
        opacity: 0.025;
        cursor: pointer;
    }
    .medigi-viewer-waveform-navigator-overlay-right {
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
.medigi-viewer-waveform-wrapper .rangeslider-grabber-min,
.medigi-viewer-waveform-wrapper .rangeslider-grabber-max {
    pointer-events: none !important;
}
</style>
