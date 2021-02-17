<template>

    <div ref="wrapper" class="medigi-viewer-waveform-wrapper" @mouseleave="hideAnnotationMenu">
        <div ref="container" :id="`container-${resource.id}-${instanceNum}`"
            @contextmenu.prevent
        ></div>
    </div>

</template>

<script lang="ts">
import { SignalResource } from '../types/assets'
// @ts-ignore: TSLint doesn't find the type definitions for Plotly.js, for some reason
import * as  Plotly from 'plotly.js/lib/index-basic.js'

let INSTANCE_NUM = 0

export default {
    props: {
        resource: Object, // SignalResource
    },
    data () {
        return {
            trace: null as any,
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
    computed: {
        channelSignals () {
            return []
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
        recalibrateTraceDimensions: function () {

        },
        updateSignalLabels: function () {

        },
    },
    mounted () {
        // Create the initial plot
        this.trace = Plotly.newPlot(
            this.$refs['container'],
            this.channelSignals,
            {
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
            this.traceOptions
        )
        // Render Y-axis signal labels and signal data
        this.updateSignalLabels()
        this.recalibrateTraceDimensions() // Includes refreshChart()
    }
}
</script>

<style>

</style>
