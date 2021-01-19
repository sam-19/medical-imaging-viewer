<template>
    <div class="medigi-viewer-sidebar-item">
        <div class="medigi-viewer-sidebar-icon">
            <DICOMMediaIcon :type="type" :cover="cover" :count="count" :label="label" />
        </div>
        <div class="medigi-viewer-sidebar-details">
            <div>{{ title }}</div>
            <div v-if="count>1 && type==='image-stack'">{{ $t('sidebaritem.imagecount', { count: count }) }}</div>
            <div v-if="count>1 && type==='biosignal'">{{ $t('sidebaritem.channelcount', { count: count }) }}</div>
        </div>
    </div>
</template>

<script lang="ts">

import Vue from 'vue'

export default Vue.extend({
    components: {
        DICOMMediaIcon: () => import('./DICOMMediaIcon.vue'),
    },
    props: {
        count: Number,
        cover: String,
        label: String,
        title: String,
        type: String,
        url: String,
    },
    methods: {
    },
    mounted () {
    },
})

</script>

<style scoped>
.medigi-viewer-sidebar-item {
    display: flex;
    height: 139px;
    width: 100%;
    padding: 5px;
    margin-top: 10px;
    cursor: pointer;
    border: 2px solid var(--medigi-viewer-border-faint);
    border-radius: 10px;
}
    .medigi-viewer-sidebar-item:hover {
        border-color: var(--medigi-viewer-border-highlight);
    }
    .medigi-viewer-sidebar-details {
        height: 60px;
        flex-grow: 1;
        padding: 5px 0 0 5px;
        color: var(--medigi-viewer-text-main);
    }
        .medigi-viewer-sidebar-details > div:nth-child(1) {
            font-size: 14px;
            line-height: 16px;
            max-height: 32px;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .medigi-viewer-sidebar-details > div:nth-child(2) {
            font-size: 12px;
            margin-top: 5px;
            color: var(--medigi-viewer-text-minor);
        }
</style>
