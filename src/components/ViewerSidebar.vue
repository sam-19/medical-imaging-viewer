<template>

    <div :id="`${$root.appName}-dicom-viewer-sidebar`">
        <div class="dicom-viewer-sidebar-dropdown">
            <span>SELECT RESOURCE</span>
            <ul>
                <li>OPTION 1</li>
                <li>OPTION 2</li>
                <li>OPTION 3</li>
                <li>OPTION 4</li>
            </ul>
        </div>
        <SidebarItem v-for="(item, idx) in mediaItems" :key="`sidebaritem${idx}`"
            :count="item.count"
            :label="item.modality"
            :title="item.title"
            :type="item.type"
        />
    </div>

</template>

<script lang="ts">

import Vue from 'vue'
import { MediaItem } from '../types/viewer'

export default Vue.extend({
    components: {
        SidebarItem: () => import('./SidebarItem.vue'),
    },
    data () {
        return {
            mediaItems: [] as MediaItem[]
        }
    },
    mounted () {
        this.mediaItems.push({ count: 1, modality: 'XR', title: 'Thorax AP', type: 'image' })
        this.mediaItems.push({ count: 64, modality: 'CT', title: 'Head CT sagittal', type: 'image' })
        this.mediaItems.push({ count: 19, modality: 'EEG', title: 'Routine EEG', type: 'biosignal' })
    }
})

</script>

<style scoped>

</style>
