<template>

    <div
        :id="`${$store.state.appName}-toolbar-button-${id}`"
        :class="[
            'medimg-viewer-toolbar-button',
            { 'medimg-viewer-toolbar-group-button': type === 'group' },
        ]"
        :title="t(tooltip)"
        @click="enabled ? $emit('button-clicked', id) : null"
    >
        <div v-if="type === 'group'"
            :class="[
                'medimg-viewer-toolbar-group-button',
                { 'medimg-viewer-toolbar-group-open': open },
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
            fixed-width
        />
        <div v-if="overlay" class="medimg-viewer-toolbar-button-overlay">
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
    },
    methods: {
        /** Shorthand for component-specific translations */
        t: function (str: string, args?: any) {
            return this.$t(`components.Toolbar.${str}`, args)
        },
    },
})

</script>

<style scoped>
.medimg-viewer-toolbar-button {
    position: relative;
    height: 60px;
    width: 60px;
    border: solid 2px var(--medimg-viewer-border);
    border-radius: 5px;
    font-size: 36px;
    cursor: pointer;
    margin-right: 10px;
    opacity: 0.8;
}
    .medimg-viewer-toolbar-button.medimg-viewer-toolbar-group-button {
        flex-basis: 90px;
        flex-shrink: 0;
    }
    .medimg-viewer-toolbar-button:hover, .medimg-viewer-toolbar-button.element-active {
        border-color: var(--medimg-viewer-border-highlight);
        opacity: 1.0;
    }
    .medimg-viewer-toolbar-button.element-active {
        box-shadow: 0 0 0 1px var(--medimg-viewer-border-highlight);
        background-color: var(--medimg-viewer-background-emphasize);
        color: var(--medimg-viewer-text-highlight);
    }
    .medimg-viewer-toolbar-button.medimg-viewer-disabled {
        opacity: 0.4 !important;
        cursor: initial !important;
        pointer-events: none;
    }
    .medimg-viewer-toolbar-button.medimg-viewer-toolbar-setfirst {
        margin-left: 10px !important;
    }
    .medimg-viewer-toolbar-button > svg {
        margin: 10px 5.5px;
    }
    .medimg-viewer-toolbar-button-overlay {
        display: inline-block;
        position: absolute;
        right: 8px;
        bottom: 7px;
        padding: 2px 4px;
        background-color: rgba(0, 0, 0, 0.5);
        border-radius: 5px;
        font-size: 40%;
    }
    .medimg-viewer-toolbar-group-button:not(.medimg-viewer-toolbar-button) {
        position: relative;
        width: 30px;
        height: 56px;
        border-right: solid 1px var(--medimg-viewer-border);
        font-size: 24px;
        float: left;
    }
        .medimg-viewer-toolbar-group-button.medimg-viewer-toolbar-group-open:not(.medimg-viewer-toolbar-button) {
            background-color: var(--medimg-viewer-background-emphasize);
        }
        .medimg-viewer-toolbar-group-button:not(.medimg-viewer-toolbar-button) > svg {
            position: absolute;
            bottom: 4px;
            left: 0;
        }

</style>
