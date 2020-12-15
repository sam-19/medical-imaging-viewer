<template>
    <div class="dicom-viewer-sidebar-item">
        <div class="dicom-viewer-sidebar-icon">
            <DICOMMediaIcon :type="type" :count="count" :label="label" />
        </div>
        <div class="dicom-viewer-sidebar-details">
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
    },
    methods: {
    }
})

</script>

<style>

</style>
