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
            <div>{{ t('{n} channels', { n: channels }) }}</div>
            <div>{{ parsedDuration }}</div>
        </div>
    </div>
</template>

<script lang="ts">

import Vue from 'vue'

export default Vue.extend({
    components: {
        EkgSidebarIcon: () => import('./EkgSidebarIcon.vue')
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
                return this.t('{d} days {h}:{m}:{s}', { d: d, h: h, m: m.toString().padStart(2, '0'), s: s.toString().padStart(2, '0') })
            } else if (h) {
                return this.t('{h}:{m}:{s} hours', { h: h, m: m.toString().padStart(2, '0'), s: s.toString().padStart(2, '0') })
            } else if (m) {
                return this.t('{m}:{s} minutes', { m: m, s: s.toString().padStart(2, '0') })
            } else {
                return this.t('{s} seconds', { s: s } )
            }
        },
    },
    methods: {
        /** Shorthand for component-specific translations */
        t: function (str: string, args?: any) {
            if (args) {
                return this.$t(`components.EKG.EkgSidebarItem.${str}`, args)
            } else {
                return (this.$t('components.EKG.EkgSidebarItem') as any)[str]
            }
        },
    },
    mounted () {
    },
})

</script>

<style scoped>
.medigi-viewer-sidebar-item {
    position: relative;
    display: flex;
    height: 89px;
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
