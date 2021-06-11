<template>

    <div :id="`${$store.state.appName}-toolbar-select-${id}`"
        :class="[
            'medimg-viewer-toolbar-select',
            { 'medimg-viewer-toolbar-select-open': dropdownOpen },
        ]"
        :title="t(tooltip)"
    >
        <div class="medimg-viewer-toolbar-select-title"
            @click="enabled ? toggleDropdown() : null"
        >
            <font-awesome-icon v-if="icon"
                :icon="icon"
                fixed-width
            />
            <div v-if="overlay" class="medimg-viewer-toolbar-select-overlay">
                {{ overlay }}
            </div>
            <div :class="[
                'medimg-viewer-toolbar-select-active',
                { 'medimg-viewer-toolbar-select-noicon': !icon || !icon.length }
            ]">
                <div class="medimg-viewer-toolbar-select-label">
                    {{ t(label) }}
                </div>
                <div class="medimg-viewer-toolbar-select-value">
                    {{ t(selectedLabel) }}
                </div>
            </div>
        </div>
        <hr v-if="dropdownOpen" />
        <div v-for="(opt, idx) in availableOptions"
            :key="`${$store.state.appName}-toolbar-select-${id}-${idx}`"
            class="medimg-viewer-toolbar-select-option"
        >
            <div v-if="opt.newGroup" class="medimg-viewer-toolbar-select-group">
                {{ t(opt.newGroup) }}
            </div>
            <div v-else :tooltip="opt.label" @click="selectOption(opt.value)">
                {{ t(opt.label) }}
            </div>
        </div>
    </div>

</template>

<script lang="ts">

import Vue from 'vue'
import { ToolbarSelectOption } from '../types/viewer'

export default Vue.extend({
    components: {
    },
    props: {
        id: String,
        enabled: Boolean,
        icon: Array,
        label: String,
        options: Array,
        overlay: String,
        selected: Number,
        tooltip: String,
    },
    data () {
        return {
            dropdownOpen: false,
        }
    },
    computed: {
        availableOptions () {
            // TODO: A way to filter out options if needed
            const options = []
            let lastGroup = ''
            for (const opt of this.options as ToolbarSelectOption[]) {
                if (opt.group !== lastGroup) {
                    options.push({ newGroup: opt.group })
                    lastGroup = opt.group
                }
                options.push(opt)
            }
            return options as ToolbarSelectOption[]
        },
        name () {
            return this.id.indexOf(':') > 0 ? this.id.split(':')[1] : this.id
        },
        selectedLabel () {
            if (this.options.length > this.selected) {
                return (this.options as ToolbarSelectOption[])[this.selected].label
            }
            return this.tooltip
        },
        type () {
            return this.id.split(':')[0]
        },
    },
    methods: {
        /** Shorthand for component-specific translations */
        t: function (str: string, args?: any) {
            return this.$t(`components.Toolbar.${str}`, args)
        },
        selectOption: function (value: string) {
            this.$emit('option-selected', value)
            this.toggleDropdown(false)
        },
        toggleDropdown: function (state?: boolean) {
            if (state === undefined) {
                this.dropdownOpen = !this.dropdownOpen
            } else {
                this.dropdownOpen = state
            }
        }
    },
})

</script>

<style scoped>

.medimg-viewer-toolbar-select {
    position: relative;
    height: 60px;
    width: 180px;
    border: solid 2px var(--medimg-viewer-border);
    background-color: var(--medimg-viewer-background);
    border-radius: 5px;
    font-size: 36px;
    cursor: pointer;
    margin-right: 10px;
    opacity: 0.8;
    z-index: 500;
    overflow: hidden;
}
    .medimg-viewer-toolbar-select-open {
        height: auto;
    }
    .medimg-viewer-toolbar-select > hr {
        margin: 0 5px;
    }
    .medimg-viewer-toolbar-select:hover, .medimg-viewer-toolbar-select.element-active {
        border-color: var(--medimg-viewer-border-highlight);
        opacity: 1.0;
    }
    .medimg-viewer-toolbar-select.medimg-viewer-disabled {
        opacity: 0.4 !important;
        cursor: initial !important;
        pointer-events: none;
    }
    .medimg-viewer-toolbar-select.medimg-viewer-toolbar-setfirst {
        margin-left: 10px !important;
    }
    .medimg-viewer-toolbar-select-title {
        display: flex;
    }
        .medimg-viewer-toolbar-select-title > svg {
            flex: 0 0 45px;
            margin: 10px 5.5px;
        }
        .medimg-viewer-toolbar-select-active {
            flex-basis: 120px;
            flex: 1; /* Take whole space if there is no icon */
        }
        .medimg-viewer-toolbar-select-noicon {
            padding-left: 10px;
        }
            .medimg-viewer-toolbar-select-label,
            .medimg-viewer-toolbar-select-value {
                width: 100%;
                height: 28px;
                line-height: 20px;
                font-size: 14px;
            }
            .medimg-viewer-toolbar-select-label {
                padding-top: 8px;
                font-weight: bold;
            }
            .medimg-viewer-toolbar-select-value {
                padding-bottom: 8px;
            }
        .medimg-viewer-toolbar-select-overlay {
            display: inline-block;
            position: absolute;
            right: 128px;
            bottom: 7px;
            padding: 2px 4px;
            background-color: rgba(0, 0, 0, 0.5);
            border-radius: 5px;
            font-size: 40%;
        }
    .medimg-viewer-toolbar-select-break {
        flex: 0 0 100%;
        width: 0;
        height: 0 !important;
    }
    .medimg-viewer-toolbar-select-option {
        width: 100%;
        height: 28px;
        line-height: 28px;
        font-size: 14px;
    }
    .medimg-viewer-toolbar-select-option > div {
        padding: 0 10px;
        overflow: hidden;
    }
        .medimg-viewer-toolbar-select-group {
            background-color: var(--medimg-viewer-background-emphasize);
            font-weight: bold;
            cursor: default;
        }
        .medimg-viewer-toolbar-select-option > div:not(.medimg-viewer-toolbar-select-group):hover {
            background-color: var(--medimg-viewer-background-highlight);
        }

</style>
