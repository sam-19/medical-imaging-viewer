<template>

    <div :id="`${$root.appName}-medigi-viewer-toolbar`">
        <ToolbarButton v-for="(button, idx) in buttonRow" :key="`toolbar-button-${idx}`"
            :id="button.id"
            :enabled="button.enabled"
            :icon="button.icon"
            :emit="button.emit"
            :tooltip="button.tooltip"
            :class="{ 'medigi-viewer-disabled': !button.enabled, 'element-active': button.active, 'medigi-viewer-toolbar-setfirst': button.setFirst }"
            @button-clicked="buttonClicked"
        >
        </ToolbarButton>
    </div>

</template>

<script lang="ts">

import Vue from 'vue'
import { MEDigiI18n } from '../i18n'
import { ToolbarButton } from '../types/viewer'
// We need an interface for buttons to access them dynamically
interface ButtonState {
    active: boolean,
    visible: boolean,
    enabled: boolean,
}
interface ButtonRow {
    adjust: ButtonState
    area: ButtonState
    distance: ButtonState
    link: ButtonState
    pan: ButtonState
    reset: ButtonState
    scroll: ButtonState
    undo: ButtonState
    zoom: ButtonState
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
                    id: 'scroll',
                    // Button set number (incremental). A small separator is placed on the button row between adjacent sets.
                    set: 0,
                    // Groups this button belongs to. When a button is activated, all other buttons in the group are disabled.
                    // Tools that use the same mouse button must all share the same group as well!
                    groups: ['interact'],
                    // The first element in the icon array is used when the button is inactive (required), the second when it's active (optional).
                    icon: [ ['fal', 'layer-group'], ['far', 'layer-group'] ],
                    // The first element in the tooltip array is used when the button is inactive (required), the second when it's active (optional).
                    tooltip:[ this.$t('Scroll image stack') ]
                },
                {
                    id: 'pan',
                    set: 0,
                    groups: ['interact'],
                    icon: [ ['fal', 'arrows'], ['far', 'arrows'] ],
                    tooltip: [ this.$t('Pan image') ]
                },
                {
                    id: 'zoom',
                    set: 0,
                    groups: ['interact'],
                    icon: [ ['fal', 'search'], ['fas', 'search'] ],
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
                    id: 'adjust',
                    set: 1,
                    groups: ['interact'],
                    icon: [ ['fad', 'adjust'] ],
                    tooltip: [ this.$t('Adjust levels') ],
                },
                {
                    id: 'distance',
                    set: 2,
                    groups: ['interact'],
                    icon: [ ['fal', 'ruler'], ['far', 'ruler'] ],
                    tooltip: [ this.$t('Measure distance') ],
                },
                {
                    id: 'area',
                    set: 2,
                    groups: ['interact'],
                    icon: [ ['fal', 'draw-circle'], ['far', 'draw-circle'] ],
                    tooltip: [ this.$t('Measure area') ],
                },
                {
                    id: 'link',
                    set: 3,
                    groups: ['interact'],
                    icon: [ ['fal', 'link'], ['fal', 'unlink'] ],
                    tooltip: [ this.$t('Link image stacks'), this.$t('Unlink image stacks') ],
                },
                {
                    id: 'undo',
                    set: 4,
                    groups: ['undo'],
                    icon: [ ['fal', 'reply'], ['fal', 'share'] ],
                    tooltip: [ this.$t('Undo last adjustment'), this.$t('Redo last adjustment') ],
                },
                {
                    id: 'reset',
                    set: 4,
                    groups: ['undo'],
                    icon: [ ['fal', 'reply-all'], ['fal', 'share-all'] ],
                    tooltip: [ this.$t('Reset all adjustments'), this.$t('Reapply all adjustment') ],
                },
            ],
            // Button states
            buttonStates: {
                adjust:   { active: false, visible: true, enabled: true } as ButtonState,
                area:     { active: false, visible: true, enabled: true } as ButtonState,
                distance: { active: false, visible: true, enabled: true } as ButtonState,
                invert:   { active: false, visible: true, enabled: true } as ButtonState,
                link:     { active: false, visible: true, enabled: true } as ButtonState,
                pan:      { active: false, visible: true, enabled: true } as ButtonState,
                reset:    { active: false, visible: true, enabled: true } as ButtonState,
                scroll:   { active: false, visible: true, enabled: true } as ButtonState,
                undo:     { active: false, visible: true, enabled: true } as ButtonState,
                zoom:     { active: false, visible: true, enabled: true } as ButtonState,
            } as ButtonRow,
            imageLink: null as number[] | null,
            // This is needed to keep the button row up to date
            buttonsUpdated: 0,
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
                        active: this.buttonStates[button.id as keyof ButtonRow].active,
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
            if (buttonId === 'adjust') {
                this.toggleAdjust()
            } else if (buttonId === 'area') {
                this.toggleArea()
            } else if (buttonId === 'distance') {
                this.toggleDistance()
            } else if (buttonId === 'link') {
                this.toggleLink()
            } else if (buttonId === 'pan') {
                this.togglePan()
            } else if (buttonId === 'reset') {
                this.resetAll()
            } else if (buttonId === 'scroll') {
                this.toggleScroll()
            } else if (buttonId === 'undo') {
                this.undoLast()
            } else if (buttonId === 'zoom') {
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
                    !this.buttonStates[button.id as keyof ButtonRow].active ? 0 : 1
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
                    !this.buttonStates[button.id as keyof ButtonRow].active ? 0 : 1
                ].toString()
            }
            return ''
        },
        /**
         * Reset all modifications, returning the media to default state.
         */
        resetAll: function () {
            this.$root.$emit('restore-default-viewport')
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
            this.buttonStates.adjust.active = !this.buttonStates.adjust.active
            this.$store.commit('SET_ACTIVE_TOOL', 'adjust')
        },
        toggleArea: function () {
            this.buttonStates.area.active = !this.buttonStates.area.active
            this.$store.commit('SET_ACTIVE_TOOL', 'area')
        },
        toggleDistance: function () {
            this.buttonStates.distance.active = !this.buttonStates.distance.active
            this.$store.commit('SET_ACTIVE_TOOL', 'distance')
        },
        toggleLink: function () {
            this.buttonStates.link.active = !this.buttonStates.link.active
            this.$store.commit('SET_ACTIVE_TOOL', 'link')
        },
        togglePan: function () {
            this.buttonStates.pan.active = !this.buttonStates.pan.active
            this.$store.commit('SET_ACTIVE_TOOL', 'pan')
        },
        toggleScroll: function () {
            this.buttonStates.scroll.active = !this.buttonStates.scroll.active
            this.$store.commit('SET_ACTIVE_TOOL', 'scroll')
        },
        toggleZoom: function () {
            this.buttonStates.zoom.active = !this.buttonStates.zoom.active
            this.$store.commit('SET_ACTIVE_TOOL', 'zoom')
        },
        undoLast: function () {

        },
    },
    mounted () {
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
