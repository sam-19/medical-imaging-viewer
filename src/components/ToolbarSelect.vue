<template>

    <div
        :id="`${$store.state.appName}-toolbar-select-${id}`"
        class="medigi-viewer-toolbar-select"
        :title="tooltip"
        @click="enabled ? toggleDropdown() : null"
    >
        <font-awesome-icon v-if="icon"
            :icon="icon"
            fixed-width
        />
        <div v-if="overlay" class="medigi-viewer-toolbar-select-overlay">
            {{ overlay }}
        </div>
        <div class="medigi-viewer-toolbar-select-option">
            <div class="medigi-viewer-toolbar-select-label">
                {{ t(label) }}
            </div>
            <div class="medigi-viewer-toolbar-select-value">
                {{ options[selected].label }}
            </div>
        </div>
        <div v-for="(opt, idx) in options"
            :key="`${$store.state.appName}-toolbar-select-${id}-${idx}`"
            class="medigi-viewer-toolbar-select-value"
        >
            {{ opt.label }}
        </div>
    </div>

</template>

<script lang="ts">

import Vue from 'vue'

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
        tooltip: String,
    },
    computed: {
        name () {
            return this.id.indexOf(':') > 0 ? this.id.split(':')[1] : this.id
        },
        type () {
            return this.id.split(':')[0]
        },
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
    },
})

</script>

<style scoped>
.medigi-viewer-toolbar-select {
    display: flex;
    position: relative;
    height: 60px;
    width: 180px;
    border: solid 2px var(--medigi-viewer-border);
    border-radius: 5px;
    font-size: 36px;
    cursor: pointer;
    margin-right: 10px;
    opacity: 0.8;
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
    .medigi-viewer-toolbar-select > svg {
        flex-basis: 45px;
        flex: 0;
        margin: 10px 5.5px;
    }
    .medigi-viewer-toolbar-select-option {
        flex-basis: 120px;
        flex: 1; /* Take whole space if there is no icon */
    }
        .medigi-viewer-toolbar-select-label,
        .medigi-viewer-toolbar-select-value {
            width: 100%;
            height: 50%;
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

</style>
