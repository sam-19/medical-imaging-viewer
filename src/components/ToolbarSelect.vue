<template>

    <div :id="`${$store.state.appName}-toolbar-select-${id}`"
        :class="[
            'medigi-viewer-toolbar-select',
            { 'medigi-viewer-toolbar-select-open': dropdownOpen },
        ]"
        :title="tooltip"
    >
        <div class="medigi-viewer-toolbar-select-title"
            @click="enabled ? toggleDropdown() : null"
        >
            <font-awesome-icon v-if="icon"
                :icon="icon"
                fixed-width
            />
            <div v-if="overlay" class="medigi-viewer-toolbar-select-overlay">
                {{ overlay }}
            </div>
            <div class="medigi-viewer-toolbar-select-active">
                <div class="medigi-viewer-toolbar-select-label">
                    {{ label }}
                </div>
                <div class="medigi-viewer-toolbar-select-value">
                    {{ selectedLabel }}
                </div>
            </div>
        </div>
        <div v-for="(opt, idx) in availableOptions"
            :key="`${$store.state.appName}-toolbar-select-${id}-${idx}`"
            class="medigi-viewer-toolbar-select-option"
        >
            <div v-if="opt.newGroup" class="medigi-viewer-toolbar-select-group">
                {{ opt.newGroup }}
            </div>
            <div v-else :tooltip="opt.label" @click="selectOption(opt.value)">
                {{ opt.label }}
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
            console.log(options)
            return options as ToolbarSelectOption[]
        },
        name () {
            return this.id.indexOf(':') > 0 ? this.id.split(':')[1] : this.id
        },
        selectedLabel () {
            console.log('lbl', this.options.length, this.selected)
            if (this.options.length > this.selected) {
                console.log('sel', (this.options as ToolbarSelectOption[])[this.selected].label)
                return (this.options as ToolbarSelectOption[])[this.selected].label
            }
            return this.tooltip
        },
        type () {
            return this.id.split(':')[0]
        },
    },
    watch: {
        selected (val, old) {
            console.log('sel', val)
        }
    },
    methods: {
        /** Shorthand for component-specific translations */
        t: function (str: string, args?: any) {
            if (args) {
                return this.$t(`components.Toolbar.${str}`, args)
            } else {
                return (this.$t('components.Toolbar') as any)[str]
            }
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

.medigi-viewer-toolbar-select {
    position: relative;
    height: 60px;
    width: 180px;
    border: solid 2px var(--medigi-viewer-border);
    background-color: var(--medigi-viewer-background);
    border-radius: 5px;
    font-size: 36px;
    cursor: pointer;
    margin-right: 10px;
    opacity: 0.8;
    z-index: 500;
    overflow: hidden;
}
    .medigi-viewer-toolbar-select-open {
        height: auto;
    }
    .medigi-viewer-toolbar-select:hover, .medigi-viewer-toolbar-select.element-active {
        border-color: var(--medigi-viewer-border-highlight);
        opacity: 1.0;
    }
    .medigi-viewer-toolbar-select.medigi-viewer-disabled {
        opacity: 0.4 !important;
        cursor: initial !important;
        pointer-events: none;
    }
    .medigi-viewer-toolbar-select.medigi-viewer-toolbar-setfirst {
        margin-left: 10px !important;
    }
    .medigi-viewer-toolbar-select-title {
        display: flex;
    }
        .medigi-viewer-toolbar-select-title > svg {
            flex: 0 0 45px;
            margin: 10px 5.5px;
        }
        .medigi-viewer-toolbar-select-active {
            flex-basis: 120px;
            flex: 1; /* Take whole space if there is no icon */
        }
            .medigi-viewer-toolbar-select-label,
            .medigi-viewer-toolbar-select-value {
                width: 100%;
                height: 28px;
                line-height: 20px;
                font-size: 14px;
            }
            .medigi-viewer-toolbar-select-label {
                padding-top: 8px;
                font-weight: bold;
            }
            .medigi-viewer-toolbar-select-value {
                padding-bottom: 8px;
            }
        .medigi-viewer-toolbar-select-overlay {
            display: inline-block;
            position: absolute;
            right: 128px;
            bottom: 7px;
            padding: 2px 4px;
            background-color: rgba(0, 0, 0, 0.5);
            border-radius: 5px;
            font-size: 40%;
        }
    .medigi-viewer-toolbar-select-break {
        flex: 0 0 100%;
        width: 0;
        height: 0 !important;
    }
    .medigi-viewer-toolbar-select-option {
        width: 100%;
        height: 28px;
        line-height: 28px;
        font-size: 14px;
    }
    .medigi-viewer-toolbar-select-option > div {
        padding: 0 5px;
        overflow: hidden;
    }
        .medigi-viewer-toolbar-select-group {
            background-color: var(--medigi-viewer-background-emphasize);
            font-weight: bold;
        }
        .medigi-viewer-toolbar-select-option > div:not(.medigi-viewer-toolbar-select-group):hover {
            background-color: var(--medigi-viewer-background-highlight);
        }

</style>
