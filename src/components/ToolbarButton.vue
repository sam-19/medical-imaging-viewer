<template>

    <div
        :id="$root.appName+'-toolbar-button-'+id"
        class="dicom-viewer-toolbar-button"
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

</style>
