<template>
    <div :id="`${$store.state.appName}-medigi-viewer-radiology-sidebar`">
        <div class="medigi-viewer-sidebar-items">
            <vue-draggable v-model="items" ref="draggable-list" :sort="allowSorting" @end="itemDropped">
                <radiology-sidebar-item v-for="(item, idx) in items" :key="`sidebaritem-${idx}-${item.id}`"
                    ref="sidebar-item"
                    :active="item.isActive"
                    :count="item.size"
                    :cover="item.coverImage"
                    :id="item.id"
                    :index="idx"
                    :label="item.modality"
                    :stack="item.isStack"
                    :title="item.name"
                    :type="item.type"
                    v-on:second-item-mounted="secondItemMounted"
                    v-on:toggle-active-item="toggleActiveItem"
                />
            </vue-draggable>
            <div :class="[
                'medigi-viewer-sidebar-loading',
                { 'medigi-viewer-hidden': !loadingStudies }
            ]">
                <font-awesome-icon :icon="['fad', 'spinner-third']" spin></font-awesome-icon>
                {{ $t('LOADING STUDIES') }}
            </div>
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
import VueDraggable from 'vuedraggable'

export default Vue.extend({
    components: {
        RadiologySidebarItem: () => import('./RadiologySidebarItem.vue'),
        VueDraggable,
    },
    props: {
        allowSorting: Boolean,
        dicomItems: Array,
        loadingStudies: Boolean,
    },
    data () {
        return {
            dropZone: null as HTMLElement | null,
            lastActivated: null as number | null,
            listShuffled: false,
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
            const heightTaken = 10 + 60 + 60 + this.dicomItems.length*149 + 20
            return `width: 100%; height: calc(100% - ${heightTaken}px`
        },
        items: {
            get (): MediaResource[] {
                return this.dicomItems as MediaResource[]
            },
            set (value: MediaResource[]) {
                // Get the new item order
                const order = value.map(item => item.id)
                this.$emit('update-item-order', order)
            },
        },
    },
    methods: {
        clearDropZoneHighlight: function () {
            if (this.dropZone) {
                this.dropZone.classList.remove('medigi-viewer-highlight')
            }
        },
        secondItemMounted: function () {
            // Make sure there really are more than one item and that it hasn't been shuffled yet
            if (this.dicomItems.length > 1 && !this.listShuffled) {
                this.listShuffled = true
                this.$nextTick(() => {
                    // This silly hack is needed because otherwise the first dragged item would always
                    // end up at the start of the list. May probably be removed if:
                    // https://github.com/SortableJS/Vue.Draggable/issues/419 and/or
                    // https://github.com/SortableJS/Vue.Draggable/issues/603
                    // are resolved in the future.
                    ;(this.$refs['draggable-list'] as any).updatePosition(0, 1)
                    ;(this.$refs['draggable-list'] as any).updatePosition(1, 0)
                })
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
        itemDropped: function (evt: any) {
            const targetId = evt?.originalEvent?.target?.id
            if (targetId && targetId.startsWith(`${this.$store.state.appName}-medigi-viewer-image-drop-`)) {
                // Image resource was dropped on one of the placeholder elements
                const targetIdx = parseInt(targetId.replace(`${this.$store.state.appName}-medigi-viewer-image-drop-`, ''))
                ;(this.dicomItems[evt.oldIndex] as MediaResource).isActive = true
                this.$emit('item-dropped', { item: evt.oldIndex, target: targetIdx })
            }
            //
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
    height: calc(100% - 50px);
    padding-top: 80px;
}
.medigi-viewer-sidebar-loading {
    height: 50px;
    line-height: 50px;
    text-align: center;
    font-weight: bold;
    color: var(--medigi-viewer-text-faint);
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
    min-height: 100px;
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
