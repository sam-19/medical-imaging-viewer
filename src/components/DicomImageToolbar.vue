<template>

    <div :id="`${$store.state.appName}-medigi-viewer-toolbar`">
        <ToolbarButton v-for="(button, idx) in buttonRow" :key="`toolbar-button-${idx}`"
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
        >
        </ToolbarButton>
    </div>

</template>

<script lang="ts">

import Vue from 'vue'
import cornerstoneTools from 'cornerstone-tools'
import { ToolbarButton } from '../types/viewer'
// We need an interface for buttons to access them dynamically
interface ButtonState {
    active: boolean,
    visible: boolean,
    enabled: boolean,
}
interface ButtonRow {
    'EllipticalRoi': ButtonState
    'flip': ButtonState
    'invert': ButtonState
    'layout': ButtonState
    'left': ButtonState
    'Length': ButtonState
    'link': ButtonState
    'Pan': ButtonState
    'reset': ButtonState
    'right': ButtonState
    'StackScroll': ButtonState
    'undo': ButtonState
    'Wwwc': ButtonState
    'Zoom': ButtonState
}
export default Vue.extend({
    components: {
        ToolbarButton: () => import('./ToolbarButton.vue'),
    },
    props: {
        allLinked: {
            type: Boolean,
            default: false
        },
        gridLayout: {
            type: Array,
            default: null
        },
        synchronizers: {
            type: Object,
            default: null
        },
    },
    data () {
        return {
            // This array is used to build the button row
            buttons: [
                {
                    // A unique identifier for the button. Must match a key in the ButtonRow interface.
                    id: 'StackScroll',
                    // Button set number (incremental). A small separator is placed on the button row between adjacent sets.
                    set: 0,
                    // Groups this button belongs to. When a button is activated, all other buttons in the group are disabled.
                    // Tools that use the same mouse button must all share the same group as well!
                    groups: ['interact'],
                    // The first element in the icon array is used when the button is inactive (required), the second when it's active (optional).
                    icon: [ ['fal', 'layer-group'] ],
                    // The first element in the tooltip array is used when the button is inactive (required), the second when it's active (optional).
                    tooltip:[ this.$t('Scroll image stack') ]
                },
                {
                    id: 'Pan',
                    set: 0,
                    groups: ['interact'],
                    icon: [ ['fal', 'arrows'] ],
                    tooltip: [ this.$t('Pan image') ]
                },
                {
                    id: 'Zoom',
                    set: 0,
                    groups: ['interact'],
                    icon: [ ['fal', 'search'] ],
                    tooltip: [ this.$t('Zoom') ],
                },
                {
                    id: 'invert',
                    set: 1,
                    groups: [],
                    icon: [ ['fad', 'clone'] ],
                    tooltip: [ this.$t('Invert image') ],
                },
                {
                    id: 'Wwwc',
                    set: 1,
                    groups: ['interact'],
                    icon: [ ['fad', 'adjust'] ],
                    tooltip: [ this.$t('Adjust levels') ],
                },
                {
                    id: 'Length',
                    set: 2,
                    groups: ['interact'],
                    icon: [ ['fal', 'ruler'] ],
                    tooltip: [ this.$t('Measure distance') ],
                },
                {
                    id: 'EllipticalRoi',
                    set: 2,
                    groups: ['interact'],
                    icon: [ ['fal', 'draw-circle'] ],
                    tooltip: [ this.$t('Measure area') ],
                },
                {
                    id: 'left',
                    set: 3,
                    groups: [],
                    icon: [ ['far', 'undo-alt'] ],
                    tooltip: [ this.$t('Rotate counter-clockwise') ],
                },
                {
                    id: 'right',
                    set: 3,
                    groups: [],
                    // Could also just flip the above icon, but don't want to create an extra option just for this
                    icon: [ ['far', 'redo-alt'] ],
                    tooltip: [ this.$t('Rotate clockwise') ],
                },
                {
                    id: 'flip',
                    set: 3,
                    groups: [],
                    icon: [ ['far', 'arrows-alt-h'] ],
                    tooltip: [ this.$t('Flip horizontally') ],
                },
                {
                    id: 'layout',
                    set: 4,
                    groups: [],
                    icon: [ ['fal', 'border-all'] ],
                    tooltip: [ this.$t('Change layout') ],
                },
                {
                    id: 'link',
                    set: 4,
                    groups: [],
                    icon: [ ['fal', 'link'], ['fal', 'unlink'] ],
                    tooltip: [ this.$t('Link image stacks'), this.$t('Unlink image stacks') ],
                },
                //{
                //    id: 'undo',
                //    set: 4,
                //    groups: ['undo'],
                //    icon: [ ['fal', 'reply'] ],
                //    tooltip: [ this.$t('Undo last adjustment'), this.$t('Redo last adjustment') ],
                //},
                {
                    id: 'reset',
                    set: 5,
                    groups: ['undo'],
                    icon: [ ['fal', 'reply-all'] ],
                    overlay: null,
                    tooltip: [ this.$t('Reset all adjustments'), this.$t('Reapply all adjustment') ],
                },
            ],
            // Button states
            buttonStates: {
                'EllipticalRoi':    { active: false, visible: true, enabled: true } as ButtonState,
                'flip':             { active: false, visible: true, enabled: true } as ButtonState,
                'invert':           { active: false, visible: true, enabled: true } as ButtonState,
                'layout':           { active: false, visible: true, enabled: true } as ButtonState,
                'left':             { active: false, visible: true, enabled: true } as ButtonState,
                'Length':           { active: false, visible: true, enabled: true } as ButtonState,
                'link':             { active: false, visible: true, enabled: true } as ButtonState,
                'Pan':              { active: false, visible: true, enabled: true } as ButtonState,
                'reset':            { active: false, visible: true, enabled: true } as ButtonState,
                'right':            { active: false, visible: true, enabled: true } as ButtonState,
                'StackScroll':      { active: false, visible: true, enabled: true } as ButtonState,
                'undo':             { active: false, visible: true, enabled: true } as ButtonState,
                'Wwwc':             { active: false, visible: true, enabled: true } as ButtonState,
                'Zoom':             { active: false, visible: true, enabled: true } as ButtonState,
            } as ButtonRow,
            imageLink: null as number[] | null,
            // This is needed to keep the button row up to date
            buttonsUpdated: 0,
            // Current grid layout
            currentLayout: 0,
            // Default options for different tool types
            toolOptions: {
                'EllipticalRoi': {
                    active: { mouseButtonMask: 1 },
                    default: {},
                },
                'Length': {
                    active: { mouseButtonMask: 1 },
                    default: {},
                },
                'Pan': {
                    active: { mouseButtonMask: 1 },
                    default: { mouseButtonMask: 1 },
                },
                'StackScroll': {
                    active: {
                        mouseButtonMask: 1,
                        synchronizationContext: this.synchronizers.stackScroll
                    },
                    default: {},
                },
                'Wwwc': {
                    active: { mouseButtonMask: 1 },
                    default: { mouseButtonMask: 2 },
                },
                'Zoom': {
                    active: { mouseButtonMask: 1 },
                    default: { mouseButtonMask: 4 },
                },
            }
        }
    },
    computed: {
        buttonRow (): ToolbarButton[] {
            this.buttonsUpdated // Trigger refresh when this value changes
            let buttons = [] as ToolbarButton[]
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
                        enabled: this.buttonStates[button.id as keyof ButtonRow].enabled,
                        setFirst: newSet,
                        icon: this.getButtonIcon(button),
                        overlay: this.getButtonOverlay(button),
                        tooltip: this.getButtonTooltip(button),
                    })
                }
            })
            return buttons
        },
    },
    methods: {
        /**
         * A button was clicked.
         * @param buttonId string ID of the button
         */
        buttonClicked: function (buttonId: string) {
            if (buttonId === 'EllipticalRoi') {
                this.toggleArea()
            } else if (buttonId === 'invert') {
                this.invertColors()
            } else if (buttonId === 'flip') {
                this.flip('x')
            } else if (buttonId === 'layout') {
                this.toggleGridLayout()
            } else if (buttonId === 'left') {
                this.rotate(-90)
            } else if (buttonId === 'Length') {
                this.toggleDistance()
            } else if (buttonId === 'link') {
                this.toggleLink()
            } else if (buttonId === 'Pan') {
                this.togglePan()
            } else if (buttonId === 'reset') {
                this.resetAll()
            } else if (buttonId === 'right') {
                this.rotate(90)
            } else if (buttonId === 'StackScroll') {
                this.toggleScroll()
            } else if (buttonId === 'undo') {
                this.undoLast()
            } else if (buttonId === 'Wwwc') {
                this.toggleAdjust()
            } else if (buttonId === 'Zoom') {
                this.toggleZoom()
            }
            // Deactivate other buttons that share a group with this button
            let button = this.buttons.find((btn) => { return btn.id === buttonId })
            if (button !== undefined && button.groups.length) {
                this.buttons.forEach((btn) => {
                    if (btn.id !== button?.id && btn.groups.length &&
                        btn.groups.filter(a => button?.groups.indexOf(a) !== -1).length
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
            this.buttonsUpdated = Date.now()
        },
        enableDefaults: function () {
            cornerstoneTools.setToolActive('Pan', this.toolOptions['Pan'].default)
            cornerstoneTools.setToolActive('Wwwc', this.toolOptions['Wwwc'].default)
            cornerstoneTools.setToolActive('Zoom', this.toolOptions['Zoom'].default)
        },
        flip: function (axis: 'x' | 'y') {
            if (axis === 'x') {
                this.$store.dispatch('image:flip-horizontally')
            }
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
            switch (button.id) {
                case 'layout':
                    return this.gridLayout ?
                        `${this.gridLayout[0]}x${this.gridLayout[1]}`.replace('0', '?') : 'A'
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
         * Invert image colors.
         */
        invertColors: function () {
            this.$store.dispatch('image:invert-colors')
        },
        /**
         * Check button active state dynamically if needed, else return false.
         */
        isActive (button: string): boolean {
            switch (button) {
                case 'link':
                    return this.allLinked
                default:
                    return this.buttonStates[button as keyof ButtonRow].active
            }
        },
        /**
         * Reset all modifications, returning the media to default state.
         */
        resetAll: function () {
            this.$store.dispatch('image:restore-default-settings')
        },
        rotate: function (angle: number) {
            this.$store.dispatch('image:rotate-by', angle)
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
            this.buttonsUpdated = Date.now()
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
            this.buttonsUpdated = Date.now()
        },
        toggleAdjust: function () {
            this.buttonStates['Wwwc'].active = !this.buttonStates['Wwwc'].active
            if (this.buttonStates['Wwwc'].active) {
                cornerstoneTools.setToolActive('Wwwc', this.toolOptions['Wwwc'].active)
            } else {
                cornerstoneTools.setToolDisabled('Wwwc')
            }
            this.$store.commit('set-active-tool', 'Wwwc')
        },
        toggleArea: function () {
            this.buttonStates['EllipticalRoi'].active = !this.buttonStates['EllipticalRoi'].active
            if (this.buttonStates['EllipticalRoi'].active) {
                cornerstoneTools.setToolActive('EllipticalRoi', this.toolOptions['EllipticalRoi'].active)
            } else {
                cornerstoneTools.setToolPassive('EllipticalRoi')
            }
            this.$store.commit('set-active-tool', 'EllipticalRoi')
        },
        toggleDistance: function () {
            this.buttonStates['Length'].active = !this.buttonStates['Length'].active
            if (this.buttonStates['Length'].active) {
                cornerstoneTools.setToolActive('Length', this.toolOptions['Length'].active)
            } else {
                cornerstoneTools.setToolPassive('Length')
            }
            this.$store.commit('set-active-tool', 'Length')
        },
        toggleGridLayout: function () {
            const layouts = [null, [1, 0], [0, 1]]
            this.currentLayout = this.currentLayout < layouts.length - 1 ? this.currentLayout + 1 : 0
            this.$emit('update:gridLayout', layouts[this.currentLayout])
        },
        toggleLink: function () {
            if (this.isActive('link')) {
                // Unlink stacks
                this.$emit('link-all-resources', false)
            } else {
                // Link stacks
                this.$emit('link-all-resources', true)
            }
        },
        togglePan: function () {
            this.buttonStates['Pan'].active = !this.buttonStates['Pan'].active
            if (this.buttonStates['Pan'].active) {
                cornerstoneTools.setToolActive('Pan', this.toolOptions['Pan'].active)
            } else {
                cornerstoneTools.setToolDisabled('Pan')
            }
            this.$store.commit('set-active-tool', 'Pan')
        },
        toggleScroll: function () {
            this.buttonStates['StackScroll'].active = !this.buttonStates['StackScroll'].active
            if (this.buttonStates['StackScroll'].active) {
                cornerstoneTools.setToolActive('StackScroll', this.toolOptions['StackScroll'].active)
            } else {
                cornerstoneTools.setToolDisabled('StackScroll')
            }
            this.$store.commit('set-active-tool', 'StackScroll')
        },
        toggleZoom: function () {
            this.buttonStates['Zoom'].active = !this.buttonStates['Zoom'].active
            if (this.buttonStates['Zoom'].active) {
                cornerstoneTools.setToolActive('Zoom', this.toolOptions['Zoom'].active)
            } else {
                cornerstoneTools.setToolDisabled('Zoom')
            }
            this.$store.commit('set-active-tool', 'Zoom')
        },
        undoLast: function () {

        },
    },
    mounted () {
        // Subscribe to store dispatches
        this.$store.subscribeAction((action) => {
            switch (action.type) {
                case 'tools:re-enable-active':
                    if (this.$store.state.activeTool) {
                        // The active tool needs to be re-set to active state when a new enabled element is added to cornerstone
                        const toolOpts = this.toolOptions
                        type optType = typeof toolOpts; // Typescript gimmics
                        cornerstoneTools.setToolActive(
                            this.$store.state.activeTool,
                            this.toolOptions[this.$store.state.activeTool as keyof optType].active
                        )
                    } else {
                        this.enableDefaults()
                    }
                    cornerstoneTools.setToolActive('StackScrollMouseWheel', { })
                    // Refresh reference lines tool
                    cornerstoneTools.setToolEnabled('ReferenceLines', {
                        synchronizationContext: this.synchronizers.referenceLines,
                        color: '#C0C0C0',
                    })
                    break
            }
        })
        // Start listening to some global hooks
        this.$root.$on('setDisabledButtons', (buttonIds: string[]) => {
            this.setDisabledButtons(buttonIds)
        })
        this.$root.$on('setHiddenButtons', (buttonIds: string[]) => {
            this.setHiddenButtons(buttonIds)
        })
        this.$root.$on('toggleButton', (buttonId: string) => {
            this.buttonClicked(buttonId)
        })
        // Enable default tools
        this.enableDefaults()
    },
})



</script>

<style scoped>
.medigi-viewer-toolbar > div {
    display: flex;
    padding: 10px;
}
</style>
