<template>

    <div :id="$store.state.appName+'-dicom-element-'+elementId">

    </div>

</template>

<script lang="ts">
import Vue from 'vue'
import * as cornerstone from 'cornerstone-core'

export default Vue.extend({
    components: {
    },
    props: {
        elementId: String,
    },
    mounted () {
        const dicomEl = document.querySelector('#' + this.$store.state.appName + '-dicom-element-' + this.elementId)
    }
})

</script>

<style scoped>

</style>
