<template>
    <div class="medigi-viewer-sidebar-item"
        :class="{ 'medigi-viewer-sidebar-item-active': active }"
        @click="$emit('toggle-active-item', index, $event)"
    >
        <div class="medigi-viewer-sidebar-icon">
            <dicom-image-icon :count="count" :cover="cover" :label="label" :stack="stack" :type="type"
                v-on:loading-cover-failed="loadingCoverFailed"
             />
        </div>
        <div class="medigi-viewer-sidebar-details">
            <div>{{ title }}</div>
            <div v-if="count>1 && stack">{{ $t('sidebaritem.imagecount', { count: count }) }}</div>
        </div>
    </div>
</template>

<script lang="ts">

import Vue from 'vue'

export default Vue.extend({
    components: {
        DicomImageIcon: () => import('./DICOM/DicomImageIcon.vue'),
    },
    props: {
        active: Boolean,
        collation: Boolean,
        count: Number,
        cover: String,
        id: String,
        index: Number,
        label: String,
        stack: Boolean,
        title: String,
        type: String,
        url: String,
    },
    data () {
        return {
        }
    },
    methods: {
        loadingCoverFailed: function () {
            if (!this.stack && !this.collation) {
                console.error(`Unable to load the resource ${this.title}, removing it from resource list.`)
                this.$root.$emit('remove-dicom-resource', this.id)
            }
        },
    },
    mounted () {
        if (this.index === 1) {
            this.$emit('second-item-mounted')
        }
    },
})

</script>

<style scoped>
.medigi-viewer-sidebar-item {
    display: flex;
    height: 139px;
    width: 100%;
    padding: 5px;
    margin-bottom: 10px;
    cursor: pointer;
    border: 2px solid var(--medigi-viewer-border-faint);
    border-radius: 10px;
    opacity: 0.8;
}
    .medigi-viewer-sidebar-item:hover, .medigi-viewer-sidebar-item-active {
        opacity: 1.0;
    }
    .medigi-viewer-sidebar-item-active {
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
