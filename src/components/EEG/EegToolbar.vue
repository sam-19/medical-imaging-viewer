<template>

    <div :id="`${$store.state.appName}-medigi-viewer-ekg-toolbar`">
        <component v-for="(control, idx) in controlRow" :key="`toolbar-button-${idx}`"
            :is="control.type === 'select' ? 'toolbar-select' : 'toolbar-button'"
            :id="control.id"
            :emit="control.emit"
            :enabled="control.enabled"
            :icon="control.icon"
            :overlay="control.overlay"
            :tooltip="control.tooltip"
            :class="{
                'medigi-viewer-disabled': !control.enabled,
                'element-active': typeof control.active === 'boolean' ? control.active : control.active(),
                'medigi-viewer-toolbar-setfirst': control.setFirst
            }"
            @button-clicked="controlClicked"
        />
    </div>

</template>

<script lang="ts">
import Vue from 'vue'
import DicomWaveform from '../../assets/dicom/DicomWaveform'
import { ToolbarControlElement } from '../../types/viewer'

// We need an interface for buttons to access them dynamically
interface ControlState {
    active: boolean,
    visible: boolean,
    enabled: boolean,
}
interface ControlRow {
}

export default Vue.extend({
    props: {
        activeItems: Array,
        displayedTraceCount: Number,
        firstTraceIndex: Number,
    },
    components: {
        ToolbarButton: () => import('../ToolbarButton.vue'),
        ToolbarSelect: () => import('../ToolbarSelect.vue'),
    },
    data () {
        return {
            // This array is used to build the button row
            controls: [] as ToolbarControlElement[],
            controlStates: {} as any,
            // This is needed to keep the button row up to date
            controlsUpdated: 0,
            // Unsubscribe from store actions
            unsubscribeActions: null as any,
        }
    },
    watch: {
        activeItems () {
            this.updateBrowseButtons()
        },
        displayedTraceCount () {
            this.updateBrowseButtons()
        },
        firstTraceIndex () {
            this.updateBrowseButtons()
        },
    },
    computed: {
        buttonRow (): ToolbarControlElement[] {
            this.controlsUpdated // Trigger refresh when this value changes
            let buttons = [] as ToolbarControlElement[]
            let buttonSet = null as number | null
            this.controls.forEach((control) => {
                // Add visible buttons
                if (this.controlStates[control.id as keyof ControlRow].visible) {
                    let newSet = false
                    if (buttonSet === null) {
                        buttonSet = control.set
                    } else if (control.set > buttonSet) {
                        newSet = true
                        buttonSet = control.set
                    }
                    buttons.push({
                        id: control.id,
                        active: this.isActive(control.id) || this.controlStates[control.id as keyof ControlRow].active,
                        enabled: this.isEnabled(control.id) && this.controlStates[control.id as keyof ControlRow].enabled,
                        set: buttonSet || 0,
                        setFirst: newSet,
                        label: control.label,
                        options: control.options,
                        icon: this.getButtonIcon(control),
                        overlay: this.getButtonOverlay(control),
                        tooltip: this.getButtonTooltip(control),
                    })
                }
            })
            return buttons
        },
        hasNextTrace (): boolean {
            for (let i=0; i<this.activeItems.length; i++) {
                if ((this.activeItems[i] as DicomWaveform).channels.length <= this.firstTraceIndex + this.displayedTraceCount) {
                    return false
                }
            }
            return (this.activeItems.length > 0)
        },
        hasPreviousTrace (): boolean {
            return (this.activeItems.length > 0 && this.firstTraceIndex > 0)
        },
    },
    methods: {
        /** Shorthand for component-specific translations */
        t: function (str: string, args?: any) {
            if (args) {
                return this.$t(`components.EEG.EegToolbar.${str}`, args)
            } else {
                return (this.$t('components.EEG.EegToolbar') as any)[str]
            }
        },
        /**
         * A button was clicked.
         * @param buttonId string ID of the button
         */
        buttonClicked: function (buttonId: string) {
            if (buttonId === 'measure') {
                this.toggleMeasure()
            } else if (buttonId === 'next') {
                this.nextTrace()
            } else if (buttonId === 'previous') {
                this.previousTrace()
            } else if (buttonId === 'ruler') {
                this.toggleRuler()
            }
            // Deactivate other buttons that share a group with this button
            let button = this.controls.find((btn) => { return btn.id === buttonId })
            if (button !== undefined && button.groups?.length) {
                this.controls.forEach((btn) => {
                    if (btn.id !== button?.id && btn.groups?.length &&
                        btn.groups.filter(a => button?.groups?.indexOf(a) !== -1).length
                    ) {
                        this.controlStates[btn.id as keyof ControlRow].active = false
                    }
                })
            }
            this.$nextTick(() => {
                if (!this.$store.state.activeTool) {
                    this.enableDefaults()
                }
            })
            // Refresh button row
            this.controlsUpdated++
        },
        /**
         * Disable a single button.
         * @param string buttonId
         */
        disableButton: function (buttonId: string) {
            const match = this.controls.find((btn) => { return btn.id === buttonId })
            if (match !== undefined) {
                this.controlStates[match.id as keyof ControlRow].enabled = false
            }
        },
        /**
         * Enable a single button.
         * @param string buttonId
         */
        enableButton: function (buttonId: string) {
            const match = this.controls.find((btn) => { return btn.id === buttonId })
            if (match !== undefined) {
                this.controlStates[match.id as keyof ControlRow].enabled = true
            }
        },
        enableDefaults: function () {
        },
        /**
         * Get the button icon appropriate for button state.
         * @param button this.controls array member or button ID string
         * @return [] | undefined
         */
        getButtonIcon: function (button: any): string[] {
            if (typeof button === 'string') {
                button = this.controls.find((btn) => { return btn.id === button })
            }
            if (typeof button !== undefined) {
                return button.icon[
                    button.icon.length === 1 ||
                    !this.isActive(button.id) ? 0 : 1
                ]
            }
            return []
        },
        /**
         * Get the appropriate overlay for the given button.
         * @param button this.controls array member or button ID string
         * @return string
         */
        getButtonOverlay: function (button: any): string {
            if (typeof button === 'string') {
                button = this.controls.find((btn) => { return btn.id === button })
            }
            return ''
        },
        /**
         * Get the button tooltip appropriate for button state.
         * @param button this.controls array member or button ID string
         * @return string
         */
        getButtonTooltip: function (button: any): string {
            if (typeof button === 'string') {
                button = this.controls.find((btn) => { return btn.id === button })
            }
            if (typeof button !== undefined) {
                return button.tooltip[
                    button.tooltip.length === 1 ||
                    !this.isActive(button.id) ? 0 : 1
                ].toString()
            }
            return ''
        },
        /**
         * Check button active state dynamically if needed, else return false.
         */
        isActive (button: string): boolean {
            return this.controlStates[button as keyof ControlRow].active
        },
        /**
         * Check if button should be enabled.
         */
        isEnabled (button: string): boolean {
            switch (button) {
                default:
                    return this.activeItems.length > 0
            }
        },
        /**
         * Display the next trace if available.
         */
        nextTrace: function () {
            if (this.hasNextTrace) {
                this.$emit('update:firstTraceIndex', this.firstTraceIndex + 1)
            }
        },
        /**
         * Display the previous trace if available.
         */
        previousTrace: function () {
            if (this.hasPreviousTrace) {
                this.$emit('update:firstTraceIndex', this.firstTraceIndex - 1)
            }
        },
        /**
         * Toggle the measurement tool.
         */
        toggleMeasure: function () {
            this.controlStates['measure'].active = !this.controlStates['measure'].active
            this.$store.commit('set-active-tool', 'measure')
        },
        /**
         * Toggle ruler display when making measurements.
         */
        toggleRuler: function () {
            this.controlStates['ruler'].active = !this.controlStates['ruler'].active
            this.$store.commit('ekg:show-ruler', this.controlStates['ruler'].active)
        },
        /**
         * Disable a set of buttons.
         * @param buttonIds string[] IDs of the buttons to disable. Providing an empty array will enable all buttons.
         */
        setDisabledButtons: function (buttonIds: string[]): void {
            // First set all buttons as enabled
            Object.keys(this.controlStates).map(key => {
                this.controlStates[key as keyof ControlRow].enabled = true
            })
            buttonIds.forEach((button) => {
                let match = this.controls.find((btn) => { return btn.id === button })
                if (match !== undefined) {
                    this.controlStates[match.id as keyof ControlRow].enabled = false
                }
            })
            // Refresh button row
            this.controlsUpdated++
        },
        /**
         * Hide a set of buttons.
         * @param buttonIds string[] IDs of the buttons to hide. Providing an empty array will show all buttons.
         */
        setHiddenButtons: function (buttonIds: string[]): void {
            // First set all buttons as visible
            Object.keys(this.controlStates).map(key => {
                this.controlStates[key as keyof ControlRow].visible = true
            })
            buttonIds.forEach((button) => {
                let match = this.controls.find((btn) => { return btn.id === button })
                if (match !== undefined) {
                    this.controlStates[match.id as keyof ControlRow].active = false // Can't leave an invisible button active
                    this.controlStates[match.id as keyof ControlRow].visible = false
                }
            })
            // Refresh button row
            this.controlsUpdated++
        },
        updateBrowseButtons: function () {
            if (!this.hasNextTrace) {
                this.disableButton('next')
            } else {
                this.enableButton('next')
            }
            if (!this.hasPreviousTrace) {
                this.disableButton('previous')
            } else {
                this.enableButton('previous')
            }
        },
    },
    mounted () {
        // Subscribe to store dispatches
        this.unsubscribeActions = this.$store.subscribeAction((action) => {

        })
        // Enable default tools
        this.enableDefaults()
    },
    beforeDestroy () {
        this.$store.commit('set-active-tool', null)
        this.unsubscribeActions()
    },
})
</script>

<style scoped>
.medigi-viewer-toolbar > div {
    display: flex;
    padding: 10px;
}
</style>
