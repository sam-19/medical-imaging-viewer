<template>

    <div
        :id="`${$root.appName}-toolbar-button-${id}`"
        class="medigi-viewer-toolbar-button"
        @click="enabled ? $emit('button-clicked', id) : null"
    >
        <font-awesome-icon
            :icon="icon"
            :title="tooltip"
            fixed-width
        />
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
        tooltip: String,
    },
})

</script>

<style scoped>
.medigi-viewer-toolbar-button {
    height: 60px;
    width: 60px;
    border: solid 2px var(--medigi-viewer-border);
    border-radius: 5px;
    font-size: 36px;
    cursor: pointer;
    margin-right: 10px;
}
    .medigi-viewer-toolbar-button:hover, .medigi-viewer-toolbar-button.element-active {
        box-shadow: 0 0 0 1px var(--medigi-viewer-border-highlight);
        border-color: var(--medigi-viewer-border-highlight);
    }
    .medigi-viewer-toolbar-button.medigi-viewer-disabled {
        opacity: 0.5 !important;
        cursor: initial !important;
    }
    .medigi-viewer-toolbar-button.medigi-viewer-toolbar-setfirst {
        margin-left: 10px !important;
    }
    .medigi-viewer-toolbar-button > svg {
        margin: 10px 5.5px;
    }
</style>
