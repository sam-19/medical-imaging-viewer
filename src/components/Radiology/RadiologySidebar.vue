<template>
    <div :id="`${$store.state.appName}-medigi-viewer-radiology-sidebar`">
        <div class="medigi-viewer-sidebar-items">
            <radiology-sidebar-item v-for="(item, idx) in items" :key="`sidebaritem-${idx}-${item.id}`"
                :active="item.isActive"
                :collation="item.isCollation"
                :count="item.size"
                :cover="item.coverImage"
                :id="item.id"
                :index="idx"
                :label="item.modality"
                :stack="item.isStack"
                :title="item.name"
                :type="item.type"
                v-on:toggle-active-item="toggleActiveItem"
            />
            <div :id="`${$store.state.appName}-medigi-viewer-radiology-dropzone`" :style="dropZoneStyles" class="medigi-viewer-dropzone"></div>
        </div>
        <div :id="`${$store.state.appName}-medigi-viewer-radiology-statusbar`" class="medigi-viewer-statusbar">
            <span>{{ $t('Cache status') }}</span>
            <span>{{ cacheImages }} {{ cacheImages === 1 ? $t('image') : $t('images') }}</span>
            <span v-if="cacheSize">
                - {{ cacheUtil }}% {{ $t('usage') }}
            </span>
        </div>
    </div>
</template>

<script lang="ts">

import Vue from 'vue'
import { MediaResource, ImageStackResource } from '../../types/assets'

export default Vue.extend({
    components: {
        RadiologySidebarItem: () => import('./RadiologySidebarItem.vue'),
    },
    props: {
        items: Array,
    },
    data () {
        return {
            dropZone: null as HTMLElement | null,
            lastActivated: null as number | null,
            mediaItems: [] as MediaResource[],
        }
    },
    computed: {
        cacheImages () {
            return this.$store.state.cacheStatus.count
        },
        cacheMax () {
            return this.$store.state.cacheStatus.max
        },
        cacheSize () {
            return this.$store.state.cacheStatus.size
        },
        cacheUtil () {
            if (!this.$store.state.cacheStatus.max) {
                return '~' // Don't want division by zero
            }
            const util = Math.round(1000*this.$store.state.cacheStatus.size/this.$store.state.cacheStatus.max)/10
            // Prepend a tilde if rounded utilization is 0% (but there are items in the cache)
            return this.$store.state.cacheStatus.count && !util ? `~${util}` : `${util}`
        },
        dropZoneStyles () {
            const heightTaken = 10 + 60 + 60 + this.items.length*149 + 20
            return `width: 100%; height: calc(100% - ${heightTaken}px`
        },
    },
    methods: {
        clearDropZoneHighlight: function () {
            if (this.dropZone) {
                this.dropZone.classList.remove('medigi-viewer-highlight')
            }
        },
        handleFileDrag: function (event: DragEvent) {
            // Prevent default event effects
            event.stopPropagation()
            event.preventDefault()
            if (event.dataTransfer) {
                // Show that dropping the file "copies" it
                event.dataTransfer.dropEffect = 'copy'
                // Highlight the dropzone
                if (this.dropZone) {
                    this.dropZone.classList.add('medigi-viewer-highlight')
                }
            }
        },
        handleFileDrop: function (event: DragEvent) {
            // Clear the highlight
            this.clearDropZoneHighlight()
            // Pass file drop event to parent component
            this.$emit('file-dropped', event)
        },
        toggleActiveItem: function (itemIdx: number, event: MouseEvent) {
            const item = this.items[itemIdx] as MediaResource
            item.isActive = !item.isActive
            if (item.isActive) {
                // If the element was activated, check if this is a shift-click to activate a range of elements
                if (this.lastActivated !== null  && this.lastActivated !== itemIdx && event.shiftKey) {
                    const diff = this.lastActivated - itemIdx
                    for (let i=1; i<=Math.abs(diff); i++) {
                        // Either add or substract i from starting index
                        const curIdx = itemIdx + (diff < 0 ? -i : i)
                        if (!(this.items[curIdx] as MediaResource).isActive) {
                            (this.items[curIdx] as MediaResource).isActive = true
                        }
                    }
                }
                // Mark as last activated
                this.lastActivated = itemIdx
            } else {
                // Unset last activated
                this.lastActivated = null
                if (item.isStack && item.isLinked) {
                    // Unlink deactivated items
                    (this.items[itemIdx] as ImageStackResource).unlink()
                }
            }
            this.$emit('element-status-changed')
        },
    },
    mounted () {
        // Set up DICOM file dropzone
        this.dropZone = document.getElementById(`${this.$store.state.appName}-medigi-viewer-radiology-dropzone`)
        if (this.dropZone) {
            this.dropZone.addEventListener('dragover', this.handleFileDrag, false)
            this.dropZone.addEventListener('drop', this.handleFileDrop, false)
            this.dropZone.addEventListener('dragleave', this.clearDropZoneHighlight, false)
        }
    },
})

</script>

<style scoped>
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
.medigi-viewer-statusbar {
    height: 50px;
    line-height: 25px;
    color: var(--medigi-viewer-text-faint);
}
    .medigi-viewer-statusbar > span:nth-child(1) {
        display: block;
    }
</style>