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
            cmPerSec: 3,
            trace: null as any,
            traceConfig: {
                margin: { t: 0, r: 0 },
                showlegend: false,
                hovermode: false,
                xaxis: {
                    tickmode: 'array',
                },
                yaxis: {
                    tickmode: 'array',
                    showgrid: false,
                    zeroline: false
                },
            },
            traceOptions: {
                displayModeBar: false,
                responsive: true,
            },
            viewStart: 0,
            viewEnd: 0,
            // We need a way to uniquely identify this component instance's elements
            // from other iterations of the same resource
            instanceNum: INSTANCE_NUM++,
        }
    },
    watch: {
        containerSize (value: Array<number>, old: Array<number>) {
            this.recalibrateTraceDimensions()
        },
    },
    computed: {
        channelSignals () {
            return []
        },
        yAxisTicks (): number[] {
            const ticks = [] as number[]
            //for (let i=0; i<this.montageConfig[this.activeMontage].channels.length; i++) {
            //    ticks.push((this.montageConfig[this.activeMontage].channels.length-i)*this.sensitivity)
            //}
            return ticks
        },
        yAxisValues (): string[] {
            const values = [] as string[]
            //for (let i=0; i<this.montageConfig[this.activeMontage].channels.length; i++) {
            //    values.push(i18n.t('biosignals.eeg.channels.'+this.montageConfig[this.activeMontage].channels[i].name) + "  ")
            //}
            return values
        },
    },
    methods: {
        calculateMontageSignals: function () {
            const signals: any[] = []
            for (let i=0; i<this.resource.channels.length; i++) {
                const chanLabel: string = this.resource.channels[i].label
                // Give EKG and EOG channels a different color
                const traceColor = '#303030'
                const xrange = Array(Math.floor(this.viewEnd-this.viewStart)).keys()
                // Wrap it into an object
                signals[i] = {
                    name: this.$t(chanLabel),
                    type: 'scattergl',
                    mode: 'lines',
                    x: xrange,
                    y: [],
                    line: { color: traceColor, width: 1 },
                }
            }
            return signals
        },
        hideAnnotationMenu: function () {

        },
        recalibrateTraceDimensions: function () {
            // Deduct the chart's left and right margins
            let viewWidth: number = -80
            if (document.fullscreenElement === null) {
                viewWidth += this.containerSize[0] as number
            } else {
                viewWidth += screen.width
            }
            let newWidth = (this.resource.resolution*viewWidth/this.$root.screenDPI)*(2.54/this.cmPerSec)
            // This check is needed to prevent "Object is possibly 'undefined'" error
            if (newWidth) {
                this.viewEnd = this.viewStart + newWidth
            }
            // Update y-axis (x-axis is updated in refreshChart method)
            const chartLayout = {
                width: this.containerSize[0],
                height: this.containerSize[1],
                yaxis: {
                    range: [0, 1000],
                    //tickmode: 'array',
                    //tickvals: this.yAxisTicks,
                    //ticktext: this.yAxisValues,
                    showgrid: false,
                    zeroline: false
                }
            }
            Plotly.relayout(this.$refs['container'], chartLayout)
        },
        updateSignalLabels: function () {

        },
    },
    mounted () {
        // Create the initial plot
        this.trace = Plotly.newPlot(
            this.$refs['container'],
            this.channelSignals,
            this.traceConfig,
            this.traceOptions
        ).then(() => {
            // Render Y-axis signal labels and signal data
            this.updateSignalLabels()
            this.recalibrateTraceDimensions()
        })
    }
})
</script>

<style>

</style>
