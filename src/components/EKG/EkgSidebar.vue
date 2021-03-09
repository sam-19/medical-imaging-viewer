<template>
    <div :id="`${$store.state.appName}-medigi-viewer-ekg-sidebar`">
        <div class="medigi-viewer-sidebar-items">
            <ekg-sidebar-item v-for="(item, idx) in items" :key="`sidebaritem-${idx}-${item.id}`"
                :active="item.isActive"
                :channels="item.channels.length"
                :duration="item.sampleCount/item.resolution"
                :id="item.id"
                :index="idx"
                :label="item.modality"
                :title="item.name"
                :type="item.type"
                v-on:toggle-active-item="toggleActiveItem"
            />
            <div :id="`${$store.state.appName}-medigi-viewer-ekg-dropzone`" :style="dropZoneStyles" class="medigi-viewer-dropzone"></div>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { MediaResource } from '../../types/assets'

export default Vue.extend({
    props: {
        items: Array,
    },
    components: {
        EkgSidebarItem: () => import('./EkgSidebarItem.vue'),
    },
    data () {
        return {
            lastActivated: null as number | null,
        }
    },
    computed: {
        dropZoneStyles () {
            const heightTaken = 10 + 60 + 60 + this.items.length*149 + 20
            return `width: 100%; height: calc(100% - ${heightTaken}px`
        },
    },
    methods: {
        toggleActiveItem: function (index: number, event: MouseEvent) {
            const item = this.items[index] as MediaResource
            item.isActive = !item.isActive
            if (item.isActive) {
                // If the element was activated, check if this is a shift-click to activate a range of elements
                if (this.lastActivated !== null  && this.lastActivated !== index && event.shiftKey) {
                    const diff = this.lastActivated - index
                    for (let i=1; i<=Math.abs(diff); i++) {
                        // Either add or substract i from starting index
                        const curIdx = index + (diff < 0 ? -i : i)
                        if (!(this.items[curIdx] as MediaResource).isActive) {
                            (this.items[curIdx] as MediaResource).isActive = true
                        }
                    }
                }
                // Mark as last activated
                this.lastActivated = index
            } else {
                // Unset last activated
                this.lastActivated = null
            }
            this.$emit('element-status-changed')
        },
    },
})
</script>

<style>
.medigi-viewer-sidebar > div {
    position: relative;
    padding: 0 0 10px 10px;
    width: 300px;
    height: calc(100% - 80px - 50px);
    margin-top: 80px;
}
.medigi-viewer-sidebar-items {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: scroll;
}
.medigi-viewer-dropzone {
    flex-grow: 1;
    margin-bottom: 10px;
    min-height: 140px;
}
    .medigi-viewer-dropzone.medigi-viewer-highlight {
        background-color: var(--medigi-viewer-background-highlight);
    }
</style>
