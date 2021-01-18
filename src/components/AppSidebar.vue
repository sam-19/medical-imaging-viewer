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
        <SidebarItem v-for="(item, idx) in items" :key="`sidebaritem${idx}`"
            :count="item.size"
            :label="item.modality"
            :title="item.name"
            :type="item.type"
            :cover="item.coverImage"
        />
        <div :id="`${$root.appName}-medigi-viewer-statusbar`" class="medigi-viewer-statusbar">
            <span>{{ $t('Cache statistics') }}</span>
            <span>{{ $store.state.cacheStatus.count }} {{ $t('images') }}</span>
            <span v-if="$store.state.cacheStatus.size">
                - {{ Math.round(1000*$store.state.cacheStatus.size/$store.state.cacheStatus.max)/10 }}% {{ $t('usage') }}
            </span>
        </div>
    </div>
</template>

<script lang="ts">

import Vue from 'vue'
import { MediaResource } from '../types/assets'

export default Vue.extend({
    components: {
        SidebarItem: () => import('./SidebarItem.vue'),
    },
    props: {
        items: Array
    },
    data () {
        return {
            mediaItems: [] as MediaResource[]
        }
    },
    mounted () {
        this.mediaItems.push({ size: 1, modality: 'XR', name: 'Thorax AP', type: 'image', url: '' })
        this.mediaItems.push({ size: 64, modality: 'CT', name: 'Head CT sagittal', type: 'image', url: '' })
        this.mediaItems.push({ size: 19, modality: 'EEG', name: 'Routine EEG', type: 'biosignal', url: '' })
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
.medigi-viewer-statusbar {
    position: absolute;
    bottom: 0;
    padding: 10px 0;
    color: var(--medigi-viewer-text-faint);
}
    .medigi-viewer-statusbar > span:nth-child(1) {
        display: block;
        padding-bottom: 5px;
    }
</style>
