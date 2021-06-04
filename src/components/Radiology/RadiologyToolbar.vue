<template>

    <div :id="`${$store.state.appName}-medigi-viewer-radiology-toolbar`">
        <div v-if="activeGroup"
            :class="[
                'medigi-viewer-toolbar-buttongroup',
            ]"
            :style="`left:${activeGroupOffset}px`"
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
            :activeGroup="activeGroup"
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
import { ToolbarControlElement } from '../../types/viewer'
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
        //'tool:Angle': ButtonState
        'tool:EllipticalRoi': ButtonState
        'tool:Length': ButtonState
        //'tool:SquareRoi': ButtonState
    'group:orientation': ButtonState
        'action:fliph': ButtonState
        'action:flipv': ButtonState
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
        anyActive: {
            type: Boolean,
            default: false,
        },
        anyItem: {
            type: Boolean,
            default: false,
        },
        anyStack: {
            type: Boolean,
            default: false,
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
            buttons: [] as { id: string, set: number, groups: string[], icon: string[][] | null, tooltip: any[] }[],
            groups: {} as ButtonGroups,
            buttonStates: {} as any,
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
                //'tool:Angle': {
                //    active: { mouseButtonMask: 1 },
                //    default: {},
                //},
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
        activeGroupButtons (): ToolbarControlElement[] {
            if (!this.activeGroup) {
                return []
            }
            const buttons = [] as ToolbarControlElement[]
            let buttonSet = null as number | null
            ;(this.groups as any)[this.activeGroup].buttons.forEach((button: any) => {
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
                        set: buttonSet || 0,
                        setFirst: newSet,
                        label: button.label,
                        options: button.options,
                        icon: this.getButtonIcon(button),
                        overlay: this.getButtonOverlay(button),
                        tooltip: this.getButtonTooltip(button),
                    })
                }
            })
            return buttons
        },
        activeGroupOffset (): number {
            if (!this.activeGroup) {
                return 0
            } else {
                return (this.groups as any)[this.activeGroup].offset
            }
        },
        buttonRow (): ToolbarControlElement[] {
            this.buttonsUpdated // Trigger refresh when this value changes
            const buttons = [] as ToolbarControlElement[]
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
    },
    methods: {
        /** Shorthand for component-specific translations */
        t: function (str: string, args?: any) {
            if (args) {
                return this.$t(`components.Radiology.RadiologyToolbar.${str}`, args)
            } else {
                return (this.$t('components.Radiology.RadiologyToolbar') as any)[str]
            }
        },
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
                } else if (id === 'fliph') {
                    this.flip('x')
                } else if (id === 'flipv') {
                    this.flip('y')
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
            } else if (type === 'layout') {
                if (id === 'auto') {
                    this.setLayout(null)
                } else if (id === 'custom') {
                    this.setLayout(this.customLayout)
                }
                // Close the button group
                this.activeGroup = null
            } else if (type === 'tool') {
                // Otherwise, toggle the appropriate tool
                this.toggleTool(id, group)
                // Deactivate other tools that share a group with this one
                const button = this.findButtonById(buttonId, group)
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
                        group.buttons.forEach((groupBtn: any) => {
                            if (groupBtn.id !== button?.id && groupBtn.groups.length &&
                                groupBtn.groups.filter((a: string) => button?.groups.indexOf(a) !== -1).length
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
            cornerstoneTools.setToolActive(`Pan-${this.$store.state.appName}`, this.toolOptions['tool:Pan'].default)
            cornerstoneTools.setToolActive(`Wwwc-${this.$store.state.appName}`, this.toolOptions['tool:Wwwc'].default)
            cornerstoneTools.setToolActive(`Zoom-${this.$store.state.appName}`, this.toolOptions['tool:Zoom'].default)
        },
        findButtonById: function (buttonId: string, group?: keyof ButtonGroups) {
            if (group) {
                return (this.groups[group] as any).buttons.find((btn: any) => { return btn.id === buttonId })
            } else {
                return this.buttons.find((btn) => { return btn.id === buttonId })
            }
        },
        flip: function (axis: 'x' | 'y') {
            if (axis === 'x') {
                this.$store.dispatch('image:flip-horizontally')
            } else if (axis === 'y') {
                this.$store.dispatch('image:flip-vertically')
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
                    //if (this.buttonStates['tool:Angle'].active) {
                    //    return this.getButtonIcon('tool:Angle', 'measurement')
                    if (this.buttonStates['tool:EllipticalRoi'].active) {
                        return this.getButtonIcon('tool:EllipticalRoi', 'measurement')
                    //} else if (this.buttonStates['tool:SquareRoi'].active) {
                    //    return this.getButtonIcon('tool:SquareRoi', 'measurement')
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
                    return /*this.buttonStates['tool:Angle'].active ||*/ this.buttonStates['tool:EllipticalRoi'].active
                           || this.buttonStates['tool:Length'].active /*|| this.buttonStates['tool:SquareRoi'].active*/
                case 'action:link':
                    return this.allLinked
                default:
                    return this.buttonStates[button as keyof ButtonRow].active
            }
        },
        /**
         * Check if button should be enabled.
         */
        isEnabled (button: string): boolean {
            switch (button) {
                case 'group:layout':
                    return this.anyItem
                case 'tool:Crosshairs':
                case 'tool:StackScroll':
                case 'action:link':
                    return this.anyStack
                default:
                    return this.anyActive
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
        setLayout: function (layout: null | number[]) {
            //const layouts = [null, [1, 0], [0, 1]]
            //this.currentLayout = this.currentLayout < layouts.length - 1 ? this.currentLayout + 1 : 0
            this.$emit('update:gridLayout', layout)
        },
        toggleGroup: function (id: string) {
            if (id === this.activeGroup) {
                this.activeGroup = null
            } else {
                this.activeGroup = id
            }
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
            this.$store.commit('set-active-tool', toolName)
            // Add app name after the tool for containment
            toolName = `${toolName}-${this.$store.state.appName}`
            if (this.buttonStates[toolId].active) {
                cornerstoneTools.setToolActive(toolName, (this.toolOptions as any)[toolId].active)
            } else {
                cornerstoneTools.setToolPassive(toolName)
            }
            // Close possible button group
            if (group) {
                this.activeGroup = null
            }
        },
        undoLast: function () {

        },
    },
    mounted () {
        // Populate button row buttons: [
        this.buttons = [
            {
                // A unique identifier for the button, in the format of <type>:<name>. Must match a key in the ButtonRow interface.
                id: 'tool:Pan',
                // Button set number (incremental). A small separator is placed on the button row between adjacent sets.
                set: 1,
                // Groups this button belongs to. When a button is activated, all other buttons in the group are disabled.
                // Tools that use the same mouse button must all share the same group as well!
                groups: ['interact'],
                // The first element in the icon array is used when the button is inactive (required), the second when it's active (optional).
                icon: [ ['fal', 'hand-paper'] ],
                // The first element in the tooltip array is used when the button is inactive (required), the second when it's active (optional).
                tooltip: [ this.t('Pan image') ]
            },
            {
                id: 'tool:Zoom',
                set: 1,
                groups: ['interact'],
                icon: [ ['fal', 'search'] ],
                tooltip: [ this.t('Zoom') ],
            },
            {
                id: 'tool:StackScroll',
                set: 1,
                groups: ['interact'],
                icon: [ ['fal', 'layer-group'] ],
                tooltip:[ this.t('Scroll image stack') ]
            },
            {
                id: 'tool:Crosshairs',
                set: 1,
                groups: ['interact'],
                icon: [ ['fal', 'crosshairs'] ],
                tooltip: [ this.t('Crosshairs') ],
            },
            {
                id: 'group:orientation',
                set: 2,
                groups: ['orientation'],
                icon: [ ['fal', 'arrows'] ],
                tooltip: [ this.t('Orientation tools') ],
            },
            {
                id: 'group:measurement',
                set: 3,
                groups: ['measurement'],
                icon: null,
                tooltip: [ this.t('Measurement tools') ],
            },
            {
                id: 'action:invert',
                set: 4,
                groups: [],
                icon: [ ['fad', 'clone'] ],
                tooltip: [ this.t('Invert image') ],
            },
            {
                id: 'tool:Wwwc',
                set: 4,
                groups: ['interact'],
                icon: [ ['fad', 'adjust'] ],
                tooltip: [ this.t('Adjust window') ],
            },
            {
                id: 'group:layout',
                set: 5,
                groups: ['layout'],
                icon: [ ['fal', 'border-all'] ],
                tooltip: [ this.t('Layout tools') ],
            },
            {
                id: 'action:link',
                set: 6,
                groups: [],
                icon: [ ['fal', 'link'], ['fal', 'unlink'] ],
                tooltip: [ this.t('Link image stacks'), this.t('Unlink image stacks') ],
            },
            {
                id: 'action:reset',
                set: 7,
                groups: ['undo'],
                icon: [ ['fal', 'reply-all'] ],
                tooltip: [ this.t('Reset all adjustments') ],
            },
        ]
        this.groups = {
            layout: {
                buttons: [
                    {
                        id: 'layout:auto',
                        set: 0,
                        groups: [],
                        icon: [ ['fal', 'border-all'] ],
                        tooltip: [ this.t('Automatic layout') ],
                    },
                    {
                        id: 'layout:custom',
                        set: 0,
                        groups: [],
                        icon: [ ['fal', 'border-all'] ],
                        tooltip: [ this.t('Custom layout') ],
                    },
                ],
                // Offset is the distance from the left end of the toolbar row (in pixels).
                offset: 660,
            },
            measurement:  {
                buttons: [
                    {
                        id: 'tool:Length',
                        set: 0,
                        groups: ['interact'],
                        icon: [ ['fal', 'ruler'] ],
                        tooltip: [ this.t('Measure distance') ],
                    },
                    //{
                    //    id: 'tool:Angle',
                    //    set: 0,
                    //    groups: ['interact'],
                    //    icon: [ ['fal', 'ruler-triangle'] ],
                    //    tooltip: [ this.t('Measure angle') ],
                    //},
                    {
                        id: 'tool:EllipticalRoi',
                        set: 0,
                        groups: ['interact'],
                        icon: [ ['fal', 'draw-circle'] ],
                        tooltip: [ this.t('Measure area') ],
                    },
                ],
                offset: 400,
            },
            orientation:  {
                buttons: [
                    {
                        id: 'action:left',
                        set: 0,
                        groups: [],
                        icon: [ ['far', 'undo-alt'] ],
                        tooltip: [ this.t('Rotate counter-clockwise') ],
                    },
                    {
                        id: 'action:right',
                        set: 0,
                        groups: [],
                        // Could also just flip the above icon, but don't want to create an extra option just for this
                        icon: [ ['far', 'redo-alt'] ],
                        tooltip: [ this.t('Rotate clockwise') ],
                    },
                    {
                        id: 'action:fliph',
                        set: 0,
                        groups: [],
                        icon: [ ['far', 'arrows-alt-h'] ],
                        tooltip: [ this.t('Flip horizontally') ],
                    },
                    {
                        id: 'action:flipv',
                        set: 0,
                        groups: [],
                        icon: [ ['far', 'arrows-alt-v'] ],
                        tooltip: [ this.t('Flip vertically') ],
                    },
                ],
                offset: 290,
            },
        } as any
        // Button states
        this.buttonStates = {
            'group:layout':         { active: false, visible: true, enabled: true } as ButtonState,
            'layout:auto':          { active: false, visible: true, enabled: true } as ButtonState,
            'layout:custom':        { active: false, visible: true, enabled: true } as ButtonState,
            'group:measurement':    { active: false, visible: true, enabled: true } as ButtonState,
            //'tool:Angle':           { active: false, visible: true, enabled: true } as ButtonState,
            'tool:Crosshairs':      { active: false, visible: true, enabled: true } as ButtonState,
            'tool:EllipticalRoi':   { active: false, visible: true, enabled: true } as ButtonState,
            //'tool:SquareRoi':       { active: false, visible: true, enabled: true } as ButtonState,
            'group:orientation':    { active: false, visible: true, enabled: true } as ButtonState,
            'action:fliph':         { active: false, visible: true, enabled: true } as ButtonState,
            'action:flipv':         { active: false, visible: true, enabled: true } as ButtonState,
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
        }
        // Subscribe to store dispatches
        this.unsubscribeActions = this.$store.subscribeAction((action) => {
            switch (action.type) {
                case 'tools:re-enable-active':
                    if (this.$store.state.activeTool) {
                        // The active tool needs to be re-set to active state when a new enabled element is added to cornerstone
                        const toolOpts = this.toolOptions
                        type optType = typeof toolOpts; // Typescript gimmics
                        cornerstoneTools.setToolActive(
                            `${this.$store.state.activeTool}-${this.$store.state.appName}`,
                            this.toolOptions[`tool:${this.$store.state.activeTool}` as keyof optType].active
                        )
                    } else {
                        this.enableDefaults()
                    }
                    cornerstoneTools.setToolActive(`StackScrollMouseWheel-${this.$store.state.appName}`, { })
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
    position: relative;
    display: flex;
    padding: 10px 0;
}
.medigi-viewer-toolbar-buttongroup {
    position: absolute;
    top: 80px;
    display: flex;
    background-color: var(--medigi-viewer-background);
    border-left: solid 1px var(--medigi-viewer-border-faint);
    border-right: solid 1px var(--medigi-viewer-border-faint);
    border-bottom: solid 1px var(--medigi-viewer-border-faint);
    padding: 0px 0px 10px 10px;
    z-index: 500;
}
</style>
