<template>

    <div :id="`${$root.appName}-medigi-viewer-sidebar`">
        <div class="medigi-viewer-sidebar-dropdown">
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
.medigi-viewer-sidebar > div {
    padding: 10px;
}
.medigi-viewer-sidebar-dropdown {
    position: relative;
    min-height: 60px;
    width: 100%;
    border: solid 2px var(--medigi-viewer-border);
    border-radius: 5px;
    font-size: 24px;
    line-height: 56px;
    font-size: 16px;
    cursor: pointer;
    z-index: 1;
}
    .medigi-viewer-sidebar-dropdown > span {
        margin: 0 10px;
    }
    .medigi-viewer-sidebar-dropdown > ul {
        display: none;
        width: 100%;
        list-style-type: none;
        margin-block-start: 0;
        margin-block-end: 0;
        padding-inline-start: 0;
    }
        .medigi-viewer-sidebar-dropdown > ul > li {
            height: 40px;
            line-height: 40px;
            padding: 0 10px;
        }
            .medigi-viewer-sidebar-dropdown > ul > li:hover {
                background-color: var(--medigi-viewer-background-highlight);
            }
    .medigi-viewer-sidebar-dropdown:hover > ul {
        display: block;
    }
</style>
