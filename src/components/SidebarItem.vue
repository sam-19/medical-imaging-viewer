<template>
    <div class="medigi-viewer-sidebar-item">
        <div class="medigi-viewer-sidebar-icon">
            <DICOMMediaIcon :type="type" :count="count" :label="label" />
        </div>
        <div class="medigi-viewer-sidebar-details">
            <div>{{ title }}</div>
            <div v-if="count>1 && type==='image'">{{ $t('sidebaritem.imagecount', { count: count }) }}</div>
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
        label: String,
        title: String,
        type: String,
        url: String,
    },
    methods: {
    },
    mounted () {
        console.log(this.$root.cornerstone)
    },
})

</script>

<style scoped>
.medigi-viewer-sidebar-item {
    display: flex;
    height: 60px;
    width: 100%;
    margin-top: 10px;
}
    .medigi-viewer-sidebar-icon {
        height: 60px;
        width: 60px;
    }
    .medigi-viewer-sidebar-details {
        height: 60px;
        width: calc(100% - 60px);
        padding-top: 5px;
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
