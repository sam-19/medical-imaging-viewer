<template>

    <div :id="`${$store.state.appName}-medigi-viewer-ekg-toolbar`">
        <toolbar-button v-for="(button, idx) in buttonRow" :key="`toolbar-button-${idx}`"
            :id="button.id"
            :emit="button.emit"
            :enabled="button.enabled"
            :icon="button.icon"
            :overlay="button.overlay"
            :tooltip="button.tooltip"
            :class="{
                'medigi-viewer-disabled': !button.enabled,
                'element-active': typeof button.active === 'boolean' ? button.active : button.active(),
                'medigi-viewer-toolbar-setfirst': button.setFirst
            }"
            @button-clicked="buttonClicked"
        />
    </div>

</template>

<script lang="ts">
import Vue from 'vue'
import DicomWaveform from '../../assets/dicom/DicomWaveform'
import { ToolbarControlElement } from '../../types/viewer'

// We need an interface for buttons to access them dynamically
interface ButtonState {
    active: boolean,
    visible: boolean,
    enabled: boolean,
}
interface ButtonRow {
    'previous': ButtonState
    'next': ButtonState
    'measure': ButtonState
    'ruler': ButtonState
}

export default Vue.extend({
    props: {
        activeItems: Array,
        displayedTraceCount: Number,
        firstTraceIndex: Number,
    },
    components: {
        ToolbarButton: () => import('../ToolbarButton.vue'),
    },
    data () {
        return {
            // This array is used to build the button row
            buttons: [] as { id: string, set: number, groups: string[], icon: string[][] | null, tooltip: any[] }[],
            buttonStates: {} as any,
            // This is needed to keep the button row up to date
            buttonsUpdated: 0,
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
            this.buttonsUpdated // Trigger refresh when this value changes
            let buttons = [] as ToolbarControlElement[]
            let buttonSet = null as number | null
            this.buttons.forEach((button) => {
                // Add visible buttons
                if (this.buttonStates[button.id as keyof ButtonRow].visible) {
                    let newSet = false
                    if (buttonSet === null) {
                        buttonSet = button.set
                    } else if (button.set > buttonSet) {
                        newSet = true
                        buttonSet = button.set
                    }
                    buttons.push({
                        id: button.id,
                        active: this.isActive(button.id) || this.buttonStates[button.id as keyof ButtonRow].active,
                        enabled: this.isEnabled(button.id) && this.buttonStates[button.id as keyof ButtonRow].enabled,
                        set: buttonSet || 0,
                        setFirst: newSet,
                        label: '',
                        options: [],
                        icon: this.getButtonIcon(button),
                        overlay: this.getButtonOverlay(button),
                        tooltip: this.getButtonTooltip(button),
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
                return this.$t(`components.EKG.EkgToolbar.${str}`, args)
            } else {
                return (this.$t('components.EKG.EkgToolbar') as any)[str]
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
            let button = this.buttons.find((btn) => { return btn.id === buttonId })
            if (button !== undefined && button.groups?.length) {
                this.buttons.forEach((btn) => {
                    if (btn.id !== button?.id && btn.groups?.length &&
                        btn.groups.filter(a => button?.groups?.indexOf(a) !== -1).length
                    ) {
                        this.buttonStates[btn.id as keyof ButtonRow].active = false
                    }
                })
            }
            this.$nextTick(() => {
                if (!this.$store.state.activeTool) {
                    this.enableDefaults()
                }
            })
            // Refresh button row
            this.buttonsUpdated++
        },
        /**
         * Disable a single button.
         * @param string buttonId
         */
        disableButton: function (buttonId: string) {
            const match = this.buttons.find((btn) => { return btn.id === buttonId })
            if (match !== undefined) {
                this.buttonStates[match.id as keyof ButtonRow].enabled = false
            }
        },
        /**
         * Enable a single button.
         * @param string buttonId
         */
        enableButton: function (buttonId: string) {
            const match = this.buttons.find((btn) => { return btn.id === buttonId })
            if (match !== undefined) {
                this.buttonStates[match.id as keyof ButtonRow].enabled = true
            }
        },
        enableDefaults: function () {
        },
        /**
         * Get the button icon appropriate for button state.
         * @param button this.buttons array member or button ID string
         * @return [] | undefined
         */
        getButtonIcon: function (button: any): string[] {
            if (typeof button === 'string') {
                button = this.buttons.find((btn) => { return btn.id === button })
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
         * @param button this.buttons array member or button ID string
         * @return string
         */
        getButtonOverlay: function (button: any): string {
            if (typeof button === 'string') {
                button = this.buttons.find((btn) => { return btn.id === button })
            }
            return ''
        },
        /**
         * Get the button tooltip appropriate for button state.
         * @param button this.buttons array member or button ID string
         * @return string
         */
        getButtonTooltip: function (button: any): string {
            if (typeof button === 'string') {
                button = this.buttons.find((btn) => { return btn.id === button })
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
            return this.buttonStates[button as keyof ButtonRow].active
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
            this.buttonStates['measure'].active = !this.buttonStates['measure'].active
            this.$store.commit('set-active-tool', 'measure')
        },
        /**
         * Toggle ruler display when making measurements.
         */
        toggleRuler: function () {
            this.buttonStates['ruler'].active = !this.buttonStates['ruler'].active
            this.$store.commit('ekg:show-ruler', this.buttonStates['ruler'].active)
        },
        /**
         * Disable a set of buttons.
         * @param buttonIds string[] IDs of the buttons to disable. Providing an empty array will enable all buttons.
         */
        setDisabledButtons: function (buttonIds: string[]): void {
            // First set all buttons as enabled
            Object.keys(this.buttonStates).map(key => {
                this.buttonStates[key as keyof ButtonRow].enabled = true
            })
            buttonIds.forEach((button) => {
                let match = this.buttons.find((btn) => { return btn.id === button })
                if (match !== undefined) {
                    this.buttonStates[match.id as keyof ButtonRow].enabled = false
                }
            })
            // Refresh button row
            this.buttonsUpdated++
        },
        /**
         * Hide a set of buttons.
         * @param buttonIds string[] IDs of the buttons to hide. Providing an empty array will show all buttons.
         */
        setHiddenButtons: function (buttonIds: string[]): void {
            // First set all buttons as visible
            Object.keys(this.buttonStates).map(key => {
                this.buttonStates[key as keyof ButtonRow].visible = true
            })
            buttonIds.forEach((button) => {
                let match = this.buttons.find((btn) => { return btn.id === button })
                if (match !== undefined) {
                    this.buttonStates[match.id as keyof ButtonRow].active = false // Can't leave an invisible button active
                    this.buttonStates[match.id as keyof ButtonRow].visible = false
                }
            })
            // Refresh button row
            this.buttonsUpdated++
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
        // Build button row (preparation for unified Toolbar component)
        this.buttons = [
            {
                // A unique identifier for the button. Must match a key in the ButtonRow interface.
                id: 'previous',
                // Button set number (incremental). A small separator is placed on the button row between adjacent sets.
                set: 0,
                // Groups this button belongs to. When a button is activated, all other buttons in the group are disabled.
                // Tools that use the same mouse button must all share the same group as well!
                groups: [],
                // The first element in the icon array is used when the button is inactive (required), the second when it's active (optional).
                icon: [ ['fal', 'arrow-alt-up'] ],
                // The first element in the tooltip array is used when the button is inactive (required), the second when it's active (optional).
                tooltip:[ this.t('Show previous set of traces') ]
            },
            {
                id: 'next',
                set: 0,
                groups: [],
                icon: [ ['fal', 'arrow-alt-down'] ],
                tooltip: [ this.t('Show next set of traces') ]
            },
            {
                id: 'measure',
                set: 1,
                groups: ['interact'],
                icon: [ ['fal', 'ruler-triangle'] ],
                tooltip: [ this.t('Measure') ]
            },
        ]
        this.buttonStates = {
            'measure':          { active: false, visible: true, enabled: true } as ButtonState,
            'next':             { active: false, visible: true, enabled: true } as ButtonState,
            'previous':         { active: false, visible: true, enabled: true } as ButtonState,
        }
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
    padding: 10px 0;
}
</style>
