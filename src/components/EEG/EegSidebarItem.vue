<template>
    <div class="medigi-viewer-sidebar-item"
        :class="{ 'medigi-viewer-sidebar-item-active': active }"
        @click="$emit('toggle-active-item', index, $event)"
    >
        <div class="medigi-viewer-sidebar-icon">
            <ekg-sidebar-icon :channels="channels" :label="label" :type="type" />
        </div>
        <div class="medigi-viewer-sidebar-details">
            <div>{{ title }}</div>
            <div>{{ $t('sidebaritem.channelcount', { count: channels }) }}</div>
            <div>{{ parsedDuration }}</div>
        </div>
    </div>
</template>

<script lang="ts">

import Vue from 'vue'

export default Vue.extend({
    components: {
        EkgSidebarIcon: () => import('./EegSidebarIcon.vue')
    },
    props: {
        active: Boolean,
        channels: Number,
        duration: Number,
        id: String,
        index: Number,
        label: String,
        title: String,
        type: String,
    },
    data () {
        return {
        }
    },
    computed: {
        parsedDuration (): string {
            const d = Math.floor(this.duration/(60*60*24))
            const h = Math.floor((this.duration%(60*60*24))/(60*60))
            const m = Math.floor((this.duration%(60*60))/60)
            const s = Math.floor(this.duration%60)
            if (d) {
                return `${d}${this.$t('days_short')} ${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
            } else if (h) {
                return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} ${this.$t('hours')}`
            } else if (m) {
                return `${m}:${s.toString().padStart(2, '0')} ${this.$t('minutes')}`
            } else {
                return `${s} ${this.$t('seconds')}`
            }
        },
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
        .medigi-viewer-sidebar-details > div:nth-child(2),
        .medigi-viewer-sidebar-details > div:nth-child(3) {
            font-size: 12px;
            margin-top: 5px;
            color: var(--medigi-viewer-text-minor);
        }
</style>
