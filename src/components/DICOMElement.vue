<template>

    <div :id="$root.appName+'-dicom-element-'+elementId">
        THIS IS A DICOM ELEMENT
    </div>

</template>

<script lang="ts">

import Vue from 'vue'

export default Vue.extend({
    components: {
    },
    props: {
        elementId: String,
    },
})

</script>

<style scoped>

</style>
