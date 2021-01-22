<template>

    <div :id="`${$root.appName}-medigi-viewer-toolbar`">
        <ToolbarButton v-for="(button, idx) in buttonRow" :key="`toolbar-button-${idx}`"
            :id="button.id"
            :enabled="button.enabled"
            :icon="button.icon"
            :emit="button.emit"
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
    'Wwwc': ButtonState
    'area': ButtonState
    'distance': ButtonState
    'flip': ButtonState
    'invert': ButtonState
    'left': ButtonState
    'link': ButtonState
    'Pan': ButtonState
    'reset': ButtonState
    'right': ButtonState
    'StackScroll': ButtonState
    'undo': ButtonState
    'Zoom': ButtonState
}
export default Vue.extend({
    components: {
        ToolbarButton: () => import('./ToolbarButton.vue'),
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
                    id: 'distance',
                    set: 2,
                    groups: ['interact'],
                    icon: [ ['fal', 'ruler'] ],
                    tooltip: [ this.$t('Measure distance') ],
                },
                {
                    id: 'area',
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
                    tooltip: [ this.$t('Reset all adjustments'), this.$t('Reapply all adjustment') ],
                },
            ],
            // Button states
            buttonStates: {
                'Wwwc':         { active: false, visible: true, enabled: true } as ButtonState,
                'area':         { active: false, visible: true, enabled: true } as ButtonState,
                'distance':     { active: false, visible: true, enabled: true } as ButtonState,
                'flip':         { active: false, visible: true, enabled: true } as ButtonState,
                'invert':       { active: false, visible: true, enabled: true } as ButtonState,
                'left':         { active: false, visible: true, enabled: true } as ButtonState,
                'link':         { active: false, visible: true, enabled: true } as ButtonState,
                'Pan':          { active: false, visible: true, enabled: true } as ButtonState,
                'reset':        { active: false, visible: true, enabled: true } as ButtonState,
                'right':        { active: false, visible: true, enabled: true } as ButtonState,
                'StackScroll':  { active: false, visible: true, enabled: true } as ButtonState,
                'undo':         { active: false, visible: true, enabled: true } as ButtonState,
                'Zoom':         { active: false, visible: true, enabled: true } as ButtonState,
            } as ButtonRow,
            imageLink: null as number[] | null,
            // This is needed to keep the button row up to date
            buttonsUpdated: 0,
            // Default options for different tool types
            toolOptions: {
                'Wwwc': {
                    active: { mouseButtonMask: 1 },
                    default: { mouseButtonMask: 2 },
                },
                'area': {
                    active: { mouseButtonMask: 1 },
                    default: {},
                },
                'distance': {
                    active: { mouseButtonMask: 1 },
                    default: {},
                },
                'Pan': {
                    active: { mouseButtonMask: 1 },
                    default: { mouseButtonMask: 1 },
                },
                'StackScroll': {
                    active: { mouseButtonMask: 1, synchronizationContext: this.$root.synchronizer },
                    default: {},
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
            if (buttonId === 'Wwwc') {
                this.toggleAdjust()
            } else if (buttonId === 'area') {
                this.toggleArea()
            } else if (buttonId === 'distance') {
                this.toggleDistance()
            } else if (buttonId === 'invert') {
                this.invertColors()
            } else if (buttonId === 'flip') {
                this.flip('x')
            } else if (buttonId === 'left') {
                this.rotate(-90)
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
            // Refresh button row
            this.buttonsUpdated = Date.now()
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
                    !(this.isActive(button.id) || this.buttonStates[button.id as keyof ButtonRow].active) ? 0 : 1
                ]
            }
            return []
        },
        /**
         * Get the button tooltip appropriate for button state.
         * @param button this.buttons array member or button ID string
         * @return [] | undefined
         */
        getButtonTooltip: function (button: any): string {
            if (typeof button === 'string') {
                button = this.buttons.find((btn) => { return btn.id === button })
            }
            if (typeof button !== undefined) {
                return button.tooltip[
                    button.tooltip.length === 1 ||
                    !(this.isActive(button.id) || this.buttonStates[button.id as keyof ButtonRow].active) ? 0 : 1
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
                    // Display link icon if no items are selected
                    if (!this.$store.state.activeItems.length) {
                        return false
                    }
                    for (let i=0; i<this.$store.state.activeItems.length; i++) {
                        if (this.$store.getters.linkedItemIds.indexOf(this.$store.state.activeItems[i]) == -1) {
                            // Return true if even one active item is not linked
                            return false
                        }
                    }
                    return true
                default:
                    return false
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
            cornerstoneTools.setToolDisabled('StackScroll')
            if (this.buttonStates['Wwwc'].active) {
                cornerstoneTools.setToolActive('Wwwc', this.toolOptions['Wwwc'].active)
            } else {
                cornerstoneTools.setToolDisabled('Wwwc')
            }
            this.$store.commit('set-active-tool', 'Wwwc')
        },
        toggleArea: function () {
            this.buttonStates.area.active = !this.buttonStates.area.active
            this.$store.commit('set-active-tool', 'area')
        },
        toggleDistance: function () {
            this.buttonStates.distance.active = !this.buttonStates.distance.active
            this.$store.commit('set-active-tool', 'distance')
        },
        toggleLink: function () {
            if (this.isActive('link')) {
                // Unlink stacks
                this.$store.dispatch('image:link-stacks', false)
            } else {
                // Link stacks
                this.$store.dispatch('image:link-stacks', true)
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
                        }
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
    }
})

</script>

<style scoped>
.medigi-viewer-toolbar > div {
    display: flex;
    padding: 10px;
}
</style>
