<template>

    <div
        :id="`${$store.state.appName}-toolbar-button-${id}`"
        :class="[
            'medigi-viewer-toolbar-button',
            { 'medigi-viewer-toolbar-group-button': type === 'group' },
        ]"
        @click="enabled ? $emit('button-clicked', id) : null"
    >
        <div v-if="type === 'group'"
            :class="[
                'medigi-viewer-toolbar-group-button',
                { 'medigi-viewer-toolbar-group-open': open },
            ]"
        >
            <font-awesome-icon
                :icon="[
                    open ? 'fas' : 'fal',
                    open ? 'caret-up' : 'caret-down'
                ]"
                fixed-width
            />
        </div>
        <font-awesome-icon
            :icon="icon"
            :title="tooltip"
            fixed-width
        />
        <div v-if="overlay" class="medigi-viewer-toolbar-button-overlay">
            {{ overlay }}
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
        activeGroup: String,
        enabled: Boolean,
        icon: Array,
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
        open () {
            if (this.type !== 'group' || this.name !== this.activeGroup) {
                return false
            } else  {
                return true
            }
        },
    }
})

</script>

<style scoped>
.medigi-viewer-toolbar-button {
    position: relative;
    height: 60px;
    width: 60px;
    border: solid 2px var(--medigi-viewer-border);
    border-radius: 5px;
    font-size: 36px;
    cursor: pointer;
    margin-right: 10px;
    opacity: 0.8;
}
    .medigi-viewer-toolbar-button.medigi-viewer-toolbar-group-button {
        width: 90px;
    }
    .medigi-viewer-toolbar-button:hover, .medigi-viewer-toolbar-button.element-active {
        border-color: var(--medigi-viewer-border-highlight);
        opacity: 1.0;
    }
    .medigi-viewer-toolbar-button.element-active {
        box-shadow: 0 0 0 1px var(--medigi-viewer-border-highlight);
        background-color: var(--medigi-viewer-background-highlight);
        color: var(--medigi-viewer-text-highlight);
    }
    .medigi-viewer-toolbar-button.medigi-viewer-disabled {
        opacity: 0.4 !important;
        cursor: initial !important;
        pointer-events: none;
    }
    .medigi-viewer-toolbar-button.medigi-viewer-toolbar-setfirst {
        margin-left: 10px !important;
    }
    .medigi-viewer-toolbar-button > svg {
        margin: 10px 5.5px;
    }
    .medigi-viewer-toolbar-button-overlay {
        display: inline-block;
        position: absolute;
        right: 8px;
        bottom: 7px;
        padding: 2px 4px;
        background-color: rgba(0, 0, 0, 0.5);
        border-radius: 5px;
        font-size: 40%;
    }
    .medigi-viewer-toolbar-group-button:not(.medigi-viewer-toolbar-button) {
        position: relative;
        width: 30px;
        height: 56px;
        border-right: solid 1px var(--medigi-viewer-border);
        font-size: 24px;
        float: left;
    }
        .medigi-viewer-toolbar-group-button.medigi-viewer-toolbar-group-open:not(.medigi-viewer-toolbar-button) {
            background-color: var(--medigi-viewer-background-highlight);
        }
        .medigi-viewer-toolbar-group-button:not(.medigi-viewer-toolbar-button) > svg {
            position: absolute;
            bottom: 4px;
            left: 0;
        }

</style>
