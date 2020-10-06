<template>

    <div data-dicomviewer>
    </div>

</template>

<script lang="ts">

    import Vue from "vue"
    import Fullscreen from 'vue-fullscreen/src/component.vue'
    import ViewerSidebar from './ViewerSidebar.vue'
    import ViewerToolbar from './ViewerToolbar.vue'

    export default Vue.extend({
        components: {
            Fullscreen, ViewerSidebar, ViewerToolbar
        }
    })

</script>
