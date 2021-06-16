<template>
    <div class="medimg-viewer-sidebar-item"
        :class="{ 'medimg-viewer-sidebar-item-active': active }"
        @click="$emit('toggle-active-item', index, $event)"
    >
        <div v-if="notice" class="medimg-viewer-sidebar-item-notice">
            <font-awesome-icon :icon="['far', 'exclamation-triangle']" :title="notice" />
        </div>
        <div class="medimg-viewer-sidebar-icon">
            <dicom-image-icon :count="count" :cover="cover" :label="label" :stack="stack" :type="type"
                v-on:loading-cover-failed="loadingCoverFailed"
             />
        </div>
        <div class="medimg-viewer-sidebar-details">
            <div>{{ title }}</div>
            <div v-if="count>1 && stack">{{ t('{n} images', { n: count }) }}</div>
        </div>
    </div>
</template>

<script lang="ts">

import Vue from 'vue'

export default Vue.extend({
    components: {
        DicomImageIcon: () => import('./Dicom/DicomImageIcon.vue'),
    },
    props: {
        active: Boolean,
        collation: Boolean,
        count: Number,
        cover: String,
        id: String,
        index: Number,
        label: String,
        notice: String,
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
        /** Shorthand for component-specific translations */
        t: function (str: string, args?: any) {
            if (args) {
                return this.$t(`components.Radiology.RadiologySidebarItem.${str}`, args)
            } else {
                return (this.$t('components.Radiology.RadiologySidebarItem') as any)[str]
            }
        },
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
.medimg-viewer-sidebar-item {
    position: relative;
    display: flex;
    height: 89px;
    width: 100%;
    padding: 5px;
    margin-bottom: 10px;
    cursor: pointer;
    border: 2px solid var(--medimg-viewer-border-faint);
    border-radius: 10px;
    opacity: 0.8;
}
    .medimg-viewer-sidebar-item:hover, .medimg-viewer-sidebar-item-active {
        opacity: 1.0;
    }
    .medimg-viewer-sidebar-item-active {
        border-color: var(--medimg-viewer-border-highlight);
    }
    .medimg-viewer-sidebar-item-notice {
        position: absolute;
        top: 10px;
        right: 10px;
        color: orange;
        font-size: 16px;
    }
    .medimg-viewer-sidebar-details {
        height: 60px;
        flex-grow: 1;
        padding: 5px 0 0 5px;
        color: var(--medimg-viewer-text-main);
    }
        .medimg-viewer-sidebar-details > div:nth-child(1) {
            font-size: 14px;
            line-height: 16px;
            max-height: 32px;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .medimg-viewer-sidebar-details > div:nth-child(2) {
            font-size: 12px;
            margin-top: 5px;
            color: var(--medimg-viewer-text-minor);
        }
</style>
