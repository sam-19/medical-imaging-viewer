<template>

    <div ref="wrapper" class="medigi-viewer-waveform-wrapper" @mouseleave="hideAnnotationMenu">
        <div ref="container" :id="`container-${resource.id}-${instanceNum}`"
            @contextmenu.prevent
        ></div>
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
        containerSize: Array,
        resource: Object, // SignalResource
    },
    data () {
        return {
            chart: null as any,
            chartConfig: {
                margin: { t: 0, r: 0 },
                showlegend: false,
                xaxis: {
                    tickmode: 'array',
                    ticklen: 5,
                    tickcolor: 'rgba(0,0,0,0)',
                    rangemode: 'tozero',
                    gridcolor: '#FFB6C1',
                    gridwidth: 1,
                    zerolinecolor: '#FFB6C1',
                    zerolinewidth: 1,
                    overlaying: 'x2',
                    //rangeslider: {},
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
                    ticklen: 10,
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
            cmPerSec: 2.5,
            cmPermV: 1,
            lastYRange: [0, 0],
            sensitivityAdjust: 1,
            viewStart: 0,
            viewEnd: 0,
            yPad: 2, // Add pad amount of squares (0,5cm) above and below the top and bottom traces
            // Keep track of some event data for chart interaction
            lastHoverPoint: { x: null, y: null },
            mouseReleased: false,
            // We need a way to uniquely identify this component instance's elements
            // from other iterations of the same resource
            instanceNum: INSTANCE_NUM++,
        }
    },
    watch: {
        containerSize (value: Array<number>, old: Array<number>) {
            const yRange = this.yAxisRange
            if (this.lastYRange[0] !== yRange[0] || this.lastYRange[1] !== yRange[1]) {
                // Redraw entire plot if y-range changed (trace count changed)
                this.redrawPlot()
            } else {
                this.recalibrateChart()
            }
        },
    },
    computed: {
        channelSignals (): any[] {
            const signals: any[] = []
            const min = this.yAxisRange[0]/4
            const max = this.yAxisRange[1]/4 - this.yPad/2
            for (let i=min; i<max; i++) {
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
            return signals
        },
        xAxisRange (): number[] {
            return (this.viewEnd - this.viewStart) > 0
                    ? [...Array(Math.floor(this.viewEnd-this.viewStart)).keys()]
                    : []
        },
        xAxisTicks (): number[] {
            const range = Math.floor(5*(this.viewEnd - this.viewStart)/this.resource.resolution)
            const ticks = []
            for (let i=0; i<range; i++) {
                ticks.push(i*this.resource.resolution/5)
            }
            return ticks
        },
        xAxis2Ticks (): number[] {
            const range = Math.floor(5*(this.viewEnd - this.viewStart)/this.resource.resolution)
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
            const range = Math.floor(5*(this.viewEnd - this.viewStart)/this.resource.resolution)
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
        yAxisRange (): number[] {
            // Display either all 12, 6, 4, 2 or just one trace at a time
            // Required height is 2 * 1cm per each trace plus padding
            const traceHeight = Math.floor(((this.$root.screenDPI/2.54)/this.cmPermV)*2)
            let traceCount = 12
            const pad = (this.yPad/2 * traceHeight) + 30
            if ((this.containerSize[1] as number) < traceHeight*2 + pad) {
                traceCount = 1
            } else if ((this.containerSize[1] as number) < traceHeight*4 + pad) {
                traceCount = 2
            } else if ((this.containerSize[1] as number) < traceHeight*6 + pad) {
                traceCount = 4
            } else if ((this.containerSize[1] as number) < traceHeight*12 + pad) {
                traceCount = 6
            }
            return [0, traceCount*4 + 2*this.yPad]
        },
        yAxisTicks (): number[] {
            const ticks = []
            for (let i=this.yAxisRange[0]; i<=this.yAxisRange[1]; i++) {
                ticks.push(i)
            }
            return ticks
        },
        yAxisTicks2 (): number[] {
            const ticks = []
            for (let i=this.yAxisRange[0]*4 + 1; i<=this.yAxisRange[1] * 4; i++) {
                if (i%4) {
                    ticks.push(i/4)
                }
            }
            return ticks
        },
        yAxisValues (): string[] {
            // Top channels depend on the view
            const values = ['', '',]
            values.push(...Array(this.yPad).fill(''))
            for (let i=0; i<this.yAxisRange[1] - this.yPad*2; i++) {
                if (i%4) {
                    values.push('')
                } else {
                    values.push(this.getChannelLabel(i/4))
                }
            }
            values.push(...Array(this.yPad-1).fill(''))
            return values.reverse()
        },
    },
    methods: {
        calculateMontageSignals: function () {
        },
        getChannelLabel: function (index: number): string {
            return this.resource.channels[index].label.split('_').length === 2
                    ? this.resource.channels[index].label.split('_')[1]
                    : this.resource.channels[index].label
        },
        hideAnnotationMenu: function () {

        },
        recalculateViewBounds: function ()  {
            // Deduct the chart's left and right margins
            let viewWidth: number = -80
            if (document.fullscreenElement === null) {
                viewWidth += this.containerSize[0] as number
            } else {
                viewWidth += screen.width
            }
            const newWidth = this.resource.resolution*(viewWidth/this.$root.screenDPI)*(2.54/this.cmPerSec)
            this.viewEnd = this.viewStart + newWidth
        },
        recalibrateChart: function () {
            this.recalculateViewBounds()
            // Update chart dimensions and the y-axis (x-axis is updated in refreshChart method)
            const y2TickVals = this.yAxisTicks2
            const chartLayout = {
                width: this.containerSize[0],
                height: Math.floor(((this.$root.screenDPI/2.54)/this.cmPermV)*(this.yAxisRange[1]/2)) + 30,
                yaxis: Object.assign({}, this.chartConfig.yaxis, {
                    range: this.yAxisRange,
                    tickvals: this.yAxisTicks,
                    ticktext: this.yAxisValues,
                }),
                yaxis2: Object.assign({}, this.chartConfig.yaxis2, {
                    range: this.yAxisRange,
                    tickvals: y2TickVals,
                    ticktext: Array(y2TickVals.length).fill(''),
                }),
            }
            Plotly.relayout(this.$refs['container'], chartLayout)
            this.refreshTraces()
        },
        redrawPlot: function () {
            // Store y-axis range so we know when to redraw the entire plot
            this.lastYRange = this.yAxisRange
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
            const min = this.yAxisRange[0]/4
            const max = this.yAxisRange[1]/4 - this.yPad/2
            for (let i=min; i<max; i++) {
                const offset = (max - i)*4
                yValues.push([] as (number|null)[])
                for (let j=0; j<this.xAxisRange.length; j++) {
                    if (j < this.resource.channels[i].signals.length) {
                        let sigVal = this.resource.channels[i].signals[j]
                        // Apply required corrections
                        if (this.resource.channels[i].baseline) {
                            // According to my sources the baseline correction is really
                            // applied before the sensitivity corrections
                            sigVal += this.resource.channels[i].baseline
                        }
                        if (this.resource.channels[i].sensitivity) {
                            sigVal *= this.resource.channels[i].sensitivity
                        }
                        if (this.resource.channels[i].sensitivityCF) {
                            sigVal *= this.resource.channels[i].sensitivityCF
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
            ;(this.$refs['container'] as any).on('plotly_hover', (e: any) => {
                if (this.mouseReleased) {
                    if (this.lastHoverPoint.x !== null && e.points[0].x !== this.lastHoverPoint.x) {
                        // Handle drag selection
                        console.log('up', e.points[0].x - (this.lastHoverPoint.x || 0))
                    }
                    this.mouseReleased = false
                }
                // Store the last hover point for drag detection
                this.lastHoverPoint = {
                    x: e.points[0].x,
                    y: e.points[0].y,
                }
            })
            ;(this.$refs['container'] as HTMLDivElement).addEventListener('mousedown', (e: any) => {
                console.log('down', this.lastHoverPoint.x, this.lastHoverPoint.y)
            })
            ;(this.$refs['container'] as HTMLDivElement).addEventListener('mouseup', (e: any) => {
                // TODO: This fires twice for some reason
                console.log('mouseup')
                this.mouseReleased = true
            })
            ;(this.$refs['wrapper'] as HTMLDivElement).addEventListener('mouseout', (e: any) => {
                this.lastHoverPoint = { x: null, y: null }
                this.mouseReleased = false
            })
            Plotly.relayout(this.$refs['container'], chartLayout)
        },
    },
    mounted () {
        // Calculate view bounds
        this.recalculateViewBounds()
        this.redrawPlot()
    }
})
</script>

<style>
/* Disable the Plotly.js dragcover element */
body > .dragcover {
    display: none !important;
    pointer-events: none !important;
}
</style>
