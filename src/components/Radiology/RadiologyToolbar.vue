<template>

    <div :id="`${$store.state.appName}-medigi-viewer-radiology-toolbar`">
        <div v-if="activeGroup"
            :class="[
                'medigi-viewer-toolbar-buttongroup',
            ]"
        >
            <toolbar-button v-for="(button, idx) in activeGroupButtons" :key="`toolbar-button-${activeGroup}-${idx}`"
                :id="button.id"
                :emit="button.emit"
                :enabled="button.enabled"
                :icon="button.icon"
                :overlay="button.overlay"
                :tooltip="button.tooltip"
                :class="[
                    { 'medigi-viewer-disabled': !button.enabled },
                    { 'element-active': typeof button.active === 'function' ? button.active() : button.active },
                    { 'medigi-viewer-toolbar-setfirst': button.setFirst }
                ]"
                @button-clicked="buttonClicked($event, activeGroup)"
            />
        </div>
        <toolbar-button v-for="(button, idx) in buttonRow" :key="`toolbar-button-${idx}`"
            :id="button.id"
            :emit="button.emit"
            :enabled="button.enabled"
            :icon="button.icon"
            :overlay="button.overlay"
            :tooltip="button.tooltip"
            :class="[
                { 'medigi-viewer-disabled': !button.enabled },
                { 'element-active': typeof button.active === 'function' ? button.active() : button.active },
                { 'medigi-viewer-toolbar-setfirst': button.setFirst }
            ]"
            @button-clicked="buttonClicked"
        />
    </div>

</template>

<script lang="ts">

import Vue from 'vue'
import cornerstoneTools from 'cornerstone-tools'
import { ToolbarButton } from '../../types/viewer' // TODO: This shares its name with the Vue component, change one?
// We need an interface for buttons to access them dynamically
interface ButtonState {
    active: boolean
    enabled: boolean
    visible: boolean
}
interface ButtonRow {
    'group:layout': ButtonState
        'layout:auto': ButtonState
        'layout:custom': ButtonState
    'group:measurement': ButtonState
        'tool:Angle': ButtonState
        'tool:EllipticalRoi': ButtonState
        'tool:Length': ButtonState
        'tool:SquareRoi': ButtonState
    'group:orientation': ButtonState
        'action:flip': ButtonState
        'action:left': ButtonState
        'action:right': ButtonState
    'tool:Crosshairs': ButtonState
    'action:invert': ButtonState
    'action:link': ButtonState
    'tool:Pan': ButtonState
    'action:reset': ButtonState
    'tool:StackScroll': ButtonState
    'action:undo': ButtonState
    'tool:Wwwc': ButtonState
    'tool:Zoom': ButtonState
}
interface ButtonGroups {
    'layout': LayoutGroup
    'measurement': MeasurementGroup
    'orientation': OrientationGroup
}
// Different preset button groups
interface LayoutGroup {
    'layout:auto': ButtonState
    'layout:custom': ButtonState
    'layout:customcols': NumberInput
    'layout:customrows': NumberInput
}
interface MeasurementGroup {
    'tool:Angle': ButtonState
    'tool:EllipticalRoi': ButtonState
    'tool:Length': ButtonState
    'tool:SquareRoi': ButtonState
}
interface OrientationGroup {
    'flip:horizontal': ButtonState
    'flip:vertical': ButtonState
    'rotate:clockwise': ButtonState
    'rotate:counterclockwise': ButtonState
}
interface NumberInput {
    value: number
}
export default Vue.extend({
    components: {
        ToolbarButton: () => import('../ToolbarButton.vue'),
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
                    // A unique identifier for the button, in the format of <type>:<name>. Must match a key in the ButtonRow interface.
                    id: 'group:layout',
                    // Button set number (incremental). A small separator is placed on the button row between adjacent sets.
                    set: 0,
                    // Groups this button belongs to. When a button is activated, all other buttons in the group are disabled.
                    // Tools that use the same mouse button must all share the same group as well!
                    groups: ['layout'],
                    // The first element in the icon array is used when the button is inactive (required), the second when it's active (optional).
                    icon: [ ['fal', 'border-all'] ],
                    // The first element in the tooltip array is used when the button is inactive (required), the second when it's active (optional).
                    tooltip: [ this.$t('Layout tools') ],
                },
                {
                    id: 'group:measurement',
                    set: 1,
                    groups: ['measurement'],
                    icon: null,
                    tooltip: [ this.$t('Measurement tools') ],
                },
                {
                    id: 'group:orientation',
                    set: 2,
                    groups: ['orientation'],
                    icon: [ ['fal', 'arrows'] ],
                    tooltip: [ this.$t('Orientation tools') ],
                },
                {
                    id: 'tool:StackScroll',
                    set: 3,
                    groups: ['interact'],
                    icon: [ ['fal', 'layer-group'] ],
                    tooltip:[ this.$t('Scroll image stack') ]
                },
                {
                    id: 'tool:Pan',
                    set: 3,
                    groups: ['interact'],
                    icon: [ ['fal', 'hand-paper'] ],
                    tooltip: [ this.$t('Pan image') ]
                },
                {
                    id: 'tool:Zoom',
                    set: 3,
                    groups: ['interact'],
                    icon: [ ['fal', 'search'] ],
                    tooltip: [ this.$t('Zoom') ],
                },
                {
                    id: 'tool:Crosshairs',
                    set: 3,
                    groups: ['interact'],
                    icon: [ ['fal', 'crosshairs'] ],
                    tooltip: [ this.$t('Crosshairs') ],
                },
                {
                    id: 'action:invert',
                    set: 4,
                    groups: [],
                    icon: [ ['fad', 'clone'] ],
                    tooltip: [ this.$t('Invert image') ],
                },
                {
                    id: 'tool:Wwwc',
                    set: 4,
                    groups: ['interact'],
                    icon: [ ['fad', 'adjust'] ],
                    tooltip: [ this.$t('Adjust window') ],
                },
                {
                    id: 'action:link',
                    set: 5,
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
                    id: 'action:reset',
                    set: 6,
                    groups: ['undo'],
                    icon: [ ['fal', 'reply-all'] ],
                    overlay: null,
                    tooltip: [ this.$t('Reset all adjustments'), this.$t('Reapply all adjustment') ],
                },
            ],
            groups: {
                layout: [
                    {
                        id: 'layout:auto',
                        set: 0,
                        groups: [],
                        icon: [ ['fal', 'border-all'] ],
                        tooltip: [ this.$t('Change layout') ],
                    },
                    {
                        id: 'layout:custom',
                        set: 0,
                        groups: [],
                        icon: [ ['fal', 'border-all'] ],
                        tooltip: [ this.$t('Change layout') ],
                    },
                ],
                measurement: [
                    {
                        id: 'tool:Length',
                        set: 0,
                        groups: ['interact'],
                        icon: [ ['fal', 'ruler'] ],
                        tooltip: [ this.$t('Measure distance') ],
                    },
                    {
                        id: 'tool:Angle',
                        set: 0,
                        groups: ['interact'],
                        icon: [ ['fal', 'ruler-triangle'] ],
                        tooltip: [ this.$t('Measure distance') ],
                    },
                    {
                        id: 'tool:EllipticalRoi',
                        set: 0,
                        groups: ['interact'],
                        icon: [ ['fal', 'draw-circle'] ],
                        tooltip: [ this.$t('Measure area') ],
                    },
                ],
                orientation: [
                    {
                        id: 'action:left',
                        set: 0,
                        groups: [],
                        icon: [ ['far', 'undo-alt'] ],
                        tooltip: [ this.$t('Rotate counter-clockwise') ],
                    },
                    {
                        id: 'action:right',
                        set: 0,
                        groups: [],
                        // Could also just flip the above icon, but don't want to create an extra option just for this
                        icon: [ ['far', 'redo-alt'] ],
                        tooltip: [ this.$t('Rotate clockwise') ],
                    },
                    {
                        id: 'action:flip',
                        set: 0,
                        groups: [],
                        icon: [ ['far', 'arrows-alt-h'] ],
                        tooltip: [ this.$t('Flip horizontally') ],
                    },
                ],
            },
            // Button states
            buttonStates: {
                'group:layout':         { active: false, visible: true, enabled: true } as ButtonState,
                'layout:auto':          { active: false, visible: true, enabled: true } as ButtonState,
                'layout:custom':        { active: false, visible: true, enabled: true } as ButtonState,
                'group:measurement':    { active: false, visible: true, enabled: true } as ButtonState,
                'tool:Angle':           { active: false, visible: true, enabled: true } as ButtonState,
                'tool:Crosshairs':      { active: false, visible: true, enabled: true } as ButtonState,
                'tool:EllipticalRoi':   { active: false, visible: true, enabled: true } as ButtonState,
                'tool:SquareRoi':       { active: false, visible: true, enabled: true } as ButtonState,
                'group:orientation':    { active: false, visible: true, enabled: true } as ButtonState,
                'action:flip':          { active: false, visible: true, enabled: true } as ButtonState,
                'action:left':          { active: false, visible: true, enabled: true } as ButtonState,
                'action:right':         { active: false, visible: true, enabled: true } as ButtonState,
                'action:invert':        { active: false, visible: true, enabled: true } as ButtonState,
                'tool:Length':          { active: false, visible: true, enabled: true } as ButtonState,
                'action:link':          { active: false, visible: true, enabled: true } as ButtonState,
                'tool:Pan':             { active: false, visible: true, enabled: true } as ButtonState,
                'action:reset':         { active: false, visible: true, enabled: true } as ButtonState,
                'tool:StackScroll':     { active: false, visible: true, enabled: true } as ButtonState,
                'action:undo':          { active: false, visible: true, enabled: true } as ButtonState,
                'tool:Wwwc':            { active: false, visible: true, enabled: true } as ButtonState,
                'tool:Zoom':            { active: false, visible: true, enabled: true } as ButtonState,
            } as ButtonRow,
            imageLink: null as number[] | null,
            // Button group that is currently open
            activeGroup: null as string | null,
            // This is needed to keep the button row up to date
            buttonsUpdated: 0,
            // Current grid layout
            currentLayout: 0,
            // State of the custom layout
            customLayout: [2, 2],
            // Default options for different tool types
            toolOptions: {
                'tool:Angle': {
                    active: { mouseButtonMask: 1 },
                    default: {},
                },
                'tool:Crosshairs': {
                    active: {
                        mouseButtonMask: 1,
                        synchronizationContext: this.synchronizers.crosshairs
                    },
                    default: {},
                },
                'tool:EllipticalRoi': {
                    active: { mouseButtonMask: 1 },
                    default: {},
                },
                'tool:Length': {
                    active: { mouseButtonMask: 1 },
                    default: {},
                },
                'tool:Pan': {
                    active: { mouseButtonMask: 1 },
                    default: { mouseButtonMask: 1 },
                },
                'tool:StackScroll': {
                    active: {
                        mouseButtonMask: 1,
                        synchronizationContext: this.synchronizers.stackScroll
                    },
                    default: {},
                },
                'tool:Wwwc': {
                    active: { mouseButtonMask: 1 },
                    default: { mouseButtonMask: 2 },
                },
                'tool:Zoom': {
                    active: { mouseButtonMask: 1 },
                    default: { mouseButtonMask: 4 },
                },
            },
            // Unsubscribe from store actions
            unsubscribeActions: null as any,
        }
    },
    computed: {
        activeGroupButtons (): ToolbarButton[] {
            if (!this.activeGroup) {
                return []
            }
            const buttons = [] as ToolbarButton[]
            let buttonSet = null as number | null
            this.groups[this.activeGroup as keyof ButtonGroups].forEach((button) => {
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
        buttonRow (): ToolbarButton[] {
            this.buttonsUpdated // Trigger refresh when this value changes
            const buttons = [] as ToolbarButton[]
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
        buttonClicked: function (buttonId: string, group?: keyof ButtonGroups) {
            const [type, id] = buttonId.split(':')
            // First check if this is a group button
            if (type === 'group') {
                this.toggleGroup(id)
            // Check if it is one of the special action buttons
            } else if (type === 'action') {
                if (id === 'invert') {
                    this.invertColors()
                } else if (id === 'flip') {
                    this.flip('x')
                } else if (id === 'layout') {
                    this.toggleLayout()
                } else if (id === 'left') {
                    this.rotate(-90)
                } else if (id === 'link') {
                    this.toggleLink()
                } else if (id === 'reset') {
                    this.resetAll()
                } else if (id === 'right') {
                    this.rotate(90)
                } else if (id === 'undo') {
                    this.undoLast()
                }
            } else if (type === 'tool') {
                // Otherwise, toggle the appropriate tool
                this.toggleTool(id, group)
                // Deactivate other tools that share a group with this one
                const button = this.findButtonById(buttonId, group)
                console.log(button)
                if (button && button.groups.length) {
                    this.buttons.forEach((btn) => {
                        if (btn.id !== button?.id && btn.groups.length &&
                            btn.groups.filter(a => button?.groups.indexOf(a) !== -1).length
                        ) {
                            this.buttonStates[btn.id as keyof ButtonRow].active = false
                        }
                    })
                    const groups = Object.values(this.groups)
                    groups.forEach((group) => {
                        group.forEach((groupBtn) => {
                            if (groupBtn.id !== button?.id && groupBtn.groups.length &&
                                groupBtn.groups.filter((a) => button?.groups.indexOf(a) !== -1).length
                            ) {
                                this.buttonStates[groupBtn.id as keyof ButtonRow].active = false
                            }
                        })
                    })
                }
            }
            this.$nextTick(() => {
                if (!this.$store.state.activeTool) {
                    this.enableDefaults()
                }
            })
            // Refresh button row
            this.buttonsUpdated++
        },
        enableDefaults: function () {
            cornerstoneTools.setToolActive('Pan', this.toolOptions['tool:Pan'].default)
            cornerstoneTools.setToolActive('Wwwc', this.toolOptions['tool:Wwwc'].default)
            cornerstoneTools.setToolActive('Zoom', this.toolOptions['tool:Zoom'].default)
        },
        findButtonById: function (buttonId: string, group?: keyof ButtonGroups) {
            if (group) {
                return this.groups[group].find((btn) => { return btn.id === buttonId })
            } else {
                return this.buttons.find((btn) => { return btn.id === buttonId })
            }
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
        getButtonIcon: function (button: any, group?: keyof ButtonGroups): string[] {
            if (typeof button === 'string') {
                button = this.findButtonById(button, group)
            }
            if (button) {
                // Check for active button group icon
                if (button.id === 'group:measurement') {
                    // Check which measurement is active (if any)
                    if (this.buttonStates['tool:Angle'].active) {
                        return this.getButtonIcon('tool:Angle', 'measurement')
                    } else if (this.buttonStates['tool:EllipticalRoi'].active) {
                        return this.getButtonIcon('tool:EllipticalRoi', 'measurement')
                    } else if (this.buttonStates['tool:SquareRoi'].active) {
                        return this.getButtonIcon('tool:SquareRoi', 'measurement')
                    } else {
                        return this.getButtonIcon('tool:Length', 'measurement')
                    }
                } else {
                    return button.icon[
                        button.icon.length === 1 ||
                        !this.isActive(button.id) ? 0 : 1
                    ]
                }
            }
            return []
        },
        /**
         * Get the appropriate overlay for the given button.
         * @param button this.buttons array member or button ID string
         * @return string
         */
        getButtonOverlay: function (button: any, group?: keyof ButtonGroups): string {
            if (typeof button === 'string') {
                button = this.findButtonById(button, group)
            }
            switch (button.id) {
                case 'group:layout':
                    return this.gridLayout ?
                           `${this.gridLayout[0] || '?'}x${this.gridLayout[1] || '?'}` : 'A'
                case 'layout:auto':
                    return 'A'
                case 'layout:custom':
                    return `${this.customLayout[0] || '?'}x${this.customLayout[1] || '?'}`
            }
            return ''
        },
        /**
         * Get the button tooltip appropriate for button state.
         * @param button this.buttons array member or button ID string
         * @return string
         */
        getButtonTooltip: function (button: any, group?: keyof ButtonGroups): string {
            if (typeof button === 'string') {
                button = this.findButtonById(button, group)
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
                case 'group:measurement':
                    return this.buttonStates['tool:Angle'].active || this.buttonStates['tool:EllipticalRoi'].active
                           || this.buttonStates['tool:Length'].active || this.buttonStates['tool:SquareRoi'].active
                case 'action:link':
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
        toggleGroup: function (id: string) {
            if (id === this.activeGroup) {
                this.activeGroup = null
            } else {
                this.activeGroup = id
            }
        },
        toggleLayout: function () {
            const layouts = [null, [1, 0], [0, 1]]
            this.currentLayout = this.currentLayout < layouts.length - 1 ? this.currentLayout + 1 : 0
            this.$emit('update:gridLayout', layouts[this.currentLayout])
        },
        toggleLink: function () {
            if (this.isActive('action:link')) {
                // Unlink stacks
                this.$emit('link-all-resources', false)
            } else {
                // Link stacks
                this.$emit('link-all-resources', true)
            }
        },
        toggleTool: function (toolName: string, group?: keyof ButtonGroups) {
            const toolId = `tool:${toolName}` as keyof ButtonRow
            this.buttonStates[toolId].active = !this.buttonStates[toolId].active
            if (this.buttonStates[toolId].active) {
                cornerstoneTools.setToolActive(toolName, (this.toolOptions as any)[toolId].active)
            } else {
                cornerstoneTools.setToolPassive(toolName)
            }
            this.$store.commit('set-active-tool', toolName)
            // Close possible button group
            if (group) {
                this.activeGroup = null
            }
        },
        undoLast: function () {

        },
    },
    mounted () {
        // Subscribe to store dispatches
        this.unsubscribeActions = this.$store.subscribeAction((action) => {
            switch (action.type) {
                case 'tools:re-enable-active':
                    if (this.$store.state.activeTool) {
                        // The active tool needs to be re-set to active state when a new enabled element is added to cornerstone
                        const toolOpts = this.toolOptions
                        type optType = typeof toolOpts; // Typescript gimmics
                        cornerstoneTools.setToolActive(
                            this.$store.state.activeTool,
                            this.toolOptions[`tool:${this.$store.state.activeTool}` as keyof optType].active
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
    padding: 10px 10px 10px 11px;
}
.medigi-viewer-toolbar-buttongroup {
    position: absolute;
    top: 80px;
    left: 1px;
    display: flex;
    background-color: var(--medigi-viewer-background);
    border-right: solid 1px var(--medigi-viewer-border-faint);
    border-bottom: solid 1px var(--medigi-viewer-border-faint);
    padding: 0px 0px 10px 10px;
    z-index: 100;
}
</style>
