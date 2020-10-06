<template>

    <div data-dicomviewer>
    </div>

</template>

<script lang="ts">

    import Vue from "vue"
    import fullscreen from 'vue-fullscreen'
    import ViewerSidebar from './ViewerSidebar.vue'
    import ViewerToolbar from './ViewerToolbar.vue'

    export default Vue.extend({
        components: {
            fullscreen, ViewerSidebar, ViewerToolbar
        }
    })

</script>
