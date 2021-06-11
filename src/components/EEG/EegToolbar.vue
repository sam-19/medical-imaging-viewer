<template>

    <div :id="`${$store.state.appName}-medimg-viewer-eeg-toolbar`">
        <component v-for="(control, idx) in controlRow" :key="`toolbar-control-${idx}`"
            :is="control.type === 'select' ? 'toolbar-select' : 'toolbar-button'"
            :id="control.id"
            :emit="control.emit"
            :enabled="control.enabled"
            :icon="control.icon"
            :label="control.label"
            :options="control.options"
            :overlay="control.overlay"
            :selected="control.selected"
            :tooltip="control.tooltip"
            :class="{
                'medimg-viewer-disabled': !control.enabled,
                'element-active': typeof control.active === 'boolean' ? control.active : control.active(),
                'medimg-viewer-toolbar-setfirst': control.setFirst
            }"
            @button-clicked="controlClicked"
            @option-selected="optionSelected(control.id, $event)"
        />
    </div>

</template>

<script lang="ts">
import Vue from 'vue'
import { ToolbarControlElement, ToolbarSelectOption } from '../../types/viewer'

// We need an interface for controls to access them dynamically
interface ControlState {
    active: boolean,
    visible: boolean,
    enabled: boolean,
}
interface ControlRow {
    'action:next': ControlState,
    'action:previous': ControlState,
    'select:montage': ControlState,
    'tool:analyse': ControlState,
}

export default Vue.extend({
    props: {
        activeItems: Array,
        allAtEnd: Boolean,
        allAtStart: Boolean,
        displayedTraceCount: Number,
        firstTraceIndex: Number,
    },
    components: {
        ToolbarButton: () => import('../ToolbarButton.vue'),
        ToolbarSelect: () => import('../ToolbarSelect.vue'),
    },
    data () {
        return {
            // This array is used to build the control row
            controls: [] as {
                id: string,
                set: number,
                groups: string[],
                icon: string[][] | null,
                label: string,
                options: ToolbarSelectOption[],
                selected?: number,
                tooltip: any[],
                type: string
            }[],
            controlStates: {} as any,
            // This is needed to keep the control row up to date
            controlsUpdated: 0,
            // Unsubscribe from store mutations
            unsubscribeSettings: null as any,
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
        controlRow (): ToolbarControlElement[] {
            this.controlsUpdated // Trigger refresh when this value changes
            const controls = [] as ToolbarControlElement[]
            let controlSet = null as number | null
            this.controls.forEach((control) => {
                // Add visible controls
                if (this.controlStates[control.id as keyof ControlRow].visible) {
                    let newSet = false
                    if (controlSet === null) {
                        controlSet = control.set
                    } else if (control.set > controlSet) {
                        newSet = true
                        controlSet = control.set
                    }
                    controls.push({
                        id: control.id,
                        active: this.isActive(control.id) || this.controlStates[control.id as keyof ControlRow].active,
                        enabled: this.isEnabled(control.id) && this.controlStates[control.id as keyof ControlRow].enabled,
                        set: controlSet || 0,
                        setFirst: newSet,
                        label: control.label,
                        options: control.options,
                        selected: control.selected,
                        icon: this.getButtonIcon(control),
                        overlay: this.getButtonOverlay(control),
                        tooltip: this.getButtonTooltip(control),
                        type: control.type
                    })
                }
            })
            return controls
        },
        hasNextPage (): boolean {
            return (this.activeItems.length > 0 && !this.allAtEnd)
        },
        hasPreviousPage (): boolean {
            return (this.activeItems.length > 0 && !this.allAtStart)
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
         * A control was clicked.
         * @param controlId string ID of the control
         */
        controlClicked: function (controlId: string) {
            if (controlId === 'tool:analyse') {
                this.toggleAnalysis()
            } else if (controlId === 'action:next') {
                this.$emit('next-page')
            } else if (controlId === 'action:previous') {
                this.$emit('previous-page')
            }
            // Deactivate other controls that share a group with this control
            let control = this.controls.find((ctrl) => { return ctrl.id === controlId })
            if (control !== undefined && control.groups?.length) {
                this.controls.forEach((ctrl) => {
                    if (ctrl.id !== control?.id && ctrl.groups?.length &&
                        ctrl.groups.filter(a => control?.groups?.indexOf(a) !== -1).length
                    ) {
                        this.controlStates[ctrl.id as keyof ControlRow].active = false
                    }
                })
            }
            this.$nextTick(() => {
                if (!this.$store.state.activeTool) {
                    this.enableDefaults()
                }
            })
            // Refresh control row
            this.controlsUpdated++
        },
        /**
         * Disable a single control.
         * @param string controlId
         */
        disableButton: function (controlId: string) {
            const match = this.controls.find((ctrl) => { return ctrl.id === controlId })
            if (match !== undefined) {
                this.controlStates[match.id as keyof ControlRow].enabled = false
            }
        },
        /**
         * Enable a single control.
         * @param string controlId
         */
        enableButton: function (controlId: string) {
            const match = this.controls.find((ctrl) => { return ctrl.id === controlId })
            if (match !== undefined) {
                this.controlStates[match.id as keyof ControlRow].enabled = true
            }
        },
        enableDefaults: function () {
        },
        /**
         * Get the control icon appropriate for control state.
         * @param control this.controls array member or control ID string
         * @return [] | undefined
         */
        getButtonIcon: function (control: any): string[] {
            if (typeof control === 'string') {
                control = this.controls.find((ctrl) => { return ctrl.id === control })
            }
            if (typeof control !== undefined) {
                return control.icon[
                    control.icon.length === 1 ||
                    !this.isActive(control.id) ? 0 : 1
                ]
            }
            return []
        },
        /**
         * Get the appropriate overlay for the given control.
         * @param control this.controls array member or control ID string
         * @return string
         */
        getButtonOverlay: function (control: any): string {
            if (typeof control === 'string') {
                control = this.controls.find((ctrl) => { return ctrl.id === control })
            }
            return ''
        },
        /**
         * Get the control tooltip appropriate for control state.
         * @param control this.controls array member or control ID string
         * @return string
         */
        getButtonTooltip: function (control: any): string {
            if (typeof control === 'string') {
                control = this.controls.find((ctrl) => { return ctrl.id === control })
            }
            const tooltip = control.tooltip[
                                control.tooltip.length === 1 ||
                                !this.isActive(control.id) ? 0 : 1
                            ]
            if (control === undefined) {
                return ''
            } else if (control.type === 'select') {
                return tooltip
            }
            return this.t(tooltip)
        },
        /**
         * Check control active state dynamically if needed, else return false.
         */
        isActive (control: string): boolean {
            return this.controlStates[control as keyof ControlRow].active
        },
        /**
         * Check if control should be enabled.
         */
        isEnabled (control: string): boolean {
            switch (control) {
                case 'action:next':
                    return this.hasNextPage
                case 'action:previous':
                    return this.hasPreviousPage
                default:
                    return this.activeItems.length > 0
            }
        },
        /**
         * Display the next page if available.
         */
        nextPage: function () {
            if (this.hasNextPage) {

            }
        },
        /**
         * Update the selected attribute on a select control
         */
        optionSelected: function (select: string, option: number) {
            for (const ctrl of this.controls) {
                if (ctrl.id === select) {
                    for (let i=0; i<ctrl.options.length; i++) {
                        if (ctrl.options[i].value === option) {
                            ctrl.selected = i
                            this.$emit('option-selected', ctrl.id, option)
                        }
                    }
                }
            }
        },
        /**
         * Display the previous page if available.
         */
        previousPage: function () {
            if (this.hasPreviousPage) {

            }
        },
        /**
         * Toggle the measurement tool.
         */
        toggleAnalysis: function () {
            this.controlStates['analyse'].active = !this.controlStates['analyse'].active
            this.$store.commit('set-active-tool', 'analyse')
        },
        /**
         * Disable a set of controls.
         * @param controlIds string[] IDs of the controls to disable. Providing an empty array will enable all controls.
         */
        setDisabledButtons: function (controlIds: string[]): void {
            // First set all controls as enabled
            Object.keys(this.controlStates).map(key => {
                this.controlStates[key as keyof ControlRow].enabled = true
            })
            controlIds.forEach((control) => {
                let match = this.controls.find((ctrl) => { return ctrl.id === control })
                if (match !== undefined) {
                    this.controlStates[match.id as keyof ControlRow].enabled = false
                }
            })
            // Refresh control row
            this.controlsUpdated++
        },
        /**
         * Hide a set of controls.
         * @param controlIds string[] IDs of the controls to hide. Providing an empty array will show all controls.
         */
        setHiddenButtons: function (controlIds: string[]): void {
            // First set all controls as visible
            Object.keys(this.controlStates).map(key => {
                this.controlStates[key as keyof ControlRow].visible = true
            })
            controlIds.forEach((control) => {
                let match = this.controls.find((ctrl) => { return ctrl.id === control })
                if (match !== undefined) {
                    this.controlStates[match.id as keyof ControlRow].active = false // Can't leave an invisible control active
                    this.controlStates[match.id as keyof ControlRow].visible = false
                }
            })
            // Refresh control row
            this.controlsUpdated++
        },
        updateBrowseButtons: function () {
        },
    },
    mounted () {
        // Build button row (preparation for unified Toolbar component)
        this.controls = [
            {
                // A unique identifier for the button. Must match a key in the ButtonRow interface.
                id: 'select:montage',
                // Button set number (incremental). A small separator is placed on the button row between adjacent sets.
                set: 0,
                // Groups this button belongs to. When a button is activated, all other buttons in the group are disabled.
                // Tools that use the same mouse button must all share the same group as well!
                groups: [],
                // Label is shown on select when no option is selected
                label: 'EEG.Montage',
                // Select control options
                options: [
                    { group: '', label: 'EEG.Raw signals', value: null },
                    // TODO: Fetch possible options from the record metadata
                    { group: 'EEG.Default montages', label: 'EEG.Record montage', value: 'default:raw' },
                    { group: 'EEG.Default montages', label: 'EEG.Double banana', value: 'default:db' },
                ],
                selected: 0,
                // The first element in the icon array is used when the button is inactive (required), the second when it's active (optional).
                icon: [],
                // The first element in the tooltip array is used when the button is inactive (required), the second when it's active (optional).
                tooltip: [ 'EEG.Select montage' ],
                type: 'select',
            },
            {
                id: 'action:previous',
                set: 1,
                groups: [],
                label: '',
                options: [],
                icon: [ ['fal', 'arrow-alt-left'] ],
                tooltip: [ 'EEG.Previous page' ],
                type: 'button',
            },
            {
                id: 'action:next',
                set: 1,
                groups: [],
                label: '',
                options: [],
                icon: [ ['fal', 'arrow-alt-right'] ],
                tooltip: [ 'EEG.Next page' ],
                type: 'button',
            },
            {
                id: 'tool:analyse',
                set: 2,
                groups: ['interact'],
                label: '',
                options: [],
                icon: [ ['fal', 'ruler-triangle'] ],
                tooltip: [ 'EEG.Analyse signal' ],
                type: 'button',
            },
        ]
        this.controlStates = {
            'action:next':          { active: false, visible: true, enabled: true } as ControlState,
            'action:previous':      { active: false, visible: true, enabled: true } as ControlState,
            'select:montage':       { active: false, visible: true, enabled: true } as ControlState,
            'tool:analyse':         { active: false, visible: true, enabled: true } as ControlState,
        }
        // Subscribe to store dispatches
        this.unsubscribeSettings = this.$store.subscribe((mutation) => {
            if (mutation.type === 'toggle-settings' && mutation.payload === false) {
                this.controlsUpdated++ // In case locale has changed
            }
        })
        // Enable default tools
        this.enableDefaults()
    },
    beforeDestroy () {
        this.$store.commit('set-active-tool', null)
        this.unsubscribeSettings()
    },
})
</script>

<style scoped>
.medimg-viewer-toolbar > div {
    display: flex;
    padding: 10px 0;
}
</style>
