<template>
    <div :id="`${$store.state.appName}-medigi-viewer-radiology-sidebar`">
        <div class="medigi-viewer-sidebar-items">
            <vue-draggable v-model="items" ref="draggable-list" :sort="allowSorting" @change="listChanged" @end="itemDropped">
                <radiology-sidebar-item v-for="(item, idx) in items" :key="`sidebaritem-${idx}-${item.id}`"
                    ref="sidebar-item"
                    :active="item.isActive"
                    :count="item.size"
                    :cover="item.coverImage"
                    :id="item.id"
                    :index="idx"
                    :label="item.modality"
                    :notice="notices[idx]"
                    :stack="item.isStack"
                    :title="item.name"
                    :type="item.type"
                    v-on:second-item-mounted="secondItemMounted"
                    v-on:toggle-active-item="toggleActiveItem"
                />
            </vue-draggable>
            <div :class="[
                'medigi-viewer-sidebar-loading',
                { 'medigi-viewer-hidden': !$store.state.loadingStudies }
            ]">
                <font-awesome-icon :icon="['fad', 'spinner-third']" spin></font-awesome-icon>
                {{ t('LOADING STUDIES') }}
            </div>
            <div :id="`${$store.state.appName}-medigi-viewer-radiology-dropzone`" :style="dropZoneStyles" class="medigi-viewer-dropzone"></div>
        </div>
        <div :id="`${$store.state.appName}-medigi-viewer-radiology-statusbar`" class="medigi-viewer-statusbar">
            <span>{{ t('Cache status') }}</span>
            <span>{{ cacheImages === 1 ? t('1 image') : t('{n} images', { n: cacheImages }) }}</span>
            <span v-if="cacheSize">
                - {{ t('{n}% used', { n: cacheUtil }) }}
            </span>
        </div>
    </div>
</template>

<script lang="ts">

import Vue from 'vue'
import { ImageResource } from '../../types/radiology'
import VueDraggable from 'vuedraggable'

export default Vue.extend({
    components: {
        RadiologySidebarItem: () => import('./RadiologySidebarItem.vue'),
        VueDraggable,
    },
    props: {
        allowSorting: Boolean,
        dicomItems: Array,
    },
    data () {
        return {
            dropZone: null as HTMLElement | null,
            lastActivated: null as number | null,
            listShuffled: false,
            mediaItems: [] as ImageResource[],
            notices: [] as string[],
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
            get (): ImageResource[] {
                return this.dicomItems as ImageResource[]
            },
            set (value: ImageResource[]) {
                // Get the new item order
                const order = value.map(item => item.id)
                this.$emit('update-item-order', order)
            },
        },
    },
    methods: {
        /** Shorthand for component-specific translations */
        t: function (str: string, args?: any) {
            if (args) {
                return this.$t(`components.Radiology.RadiologySidebar.${str}`, args)
            } else {
                return (this.$t('components.Radiology.RadiologySidebar') as any)[str]
            }
        },
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
                ;(this.dicomItems[evt.oldIndex] as ImageResource).isActive = true
                this.$emit('item-dropped', { item: evt.oldIndex, target: targetIdx })
            }
        },
        listChanged: function (evt: any) {
            // If last activated item was reordered, adjust the cached index
            if (this.lastActivated === null || !evt.moved) {
                return
            }
            if (evt.moved.oldIndex === this.lastActivated) {
                this.lastActivated = evt.moved.newIndex
            } else if (evt.moved.oldIndex < this.lastActivated && evt.moved.newIndex >= this.lastActivated) {
                // Last activated has moved up on the list
                this.lastActivated--
            } else if (evt.moved.oldIndex > this.lastActivated && evt.moved.newIndex <= this.lastActivated) {
                // Last activated has moved down on the list
                this.lastActivated++
            }
        },
        setItemNotice: function (itemIdx: number, message: string) {
            this.notices[itemIdx] = message
        },
        toggleActiveItem: function (itemIdx: number, event: MouseEvent) {
            const item = this.items[itemIdx] as ImageResource
            const otherActive = [] as ImageResource[]
            // See if there are other active items
            for (const otherItem of this.dicomItems as ImageResource[]) {
                if (item !== otherItem && otherItem.isActive) {
                    otherActive.push(otherItem)
                }
            }
            if (!item.isActive) {
                // If the element is being activated, two things must be checked:
                // - is it a ctrl-click, in which case we will leave other active items active
                // - is it a shift-click, in which case we will activate a range of elements
                if (this.lastActivated !== null  && this.lastActivated !== itemIdx && event.shiftKey) {
                    const diff = this.lastActivated - itemIdx
                    for (let i=1; i<=Math.abs(diff); i++) {
                        // Either add or substract i from starting index
                        const curIdx = itemIdx + (diff < 0 ? -i : i)
                        if (!(this.items[curIdx] as ImageResource).isActive) {
                            (this.items[curIdx] as ImageResource).isActive = true
                        }
                    }
                } else if (!event.ctrlKey) {
                    // Not a control click, deactivate other active items
                    for (const otherItem of otherActive) {
                        otherItem.isActive = false
                    }
                }
                // Mark as last activated
                this.lastActivated = itemIdx
                item.isActive = true
            } else {
                // If the element is being deactivated, check if there are other active items
                if (otherActive.length) {
                    // In this case, keep the element active, but deactivate the others, or
                    // if control is pressed, just deactivate this item
                    if (!event.ctrlKey) {
                        for (const otherItem of otherActive) {
                            otherItem.isActive = false
                            if (otherItem.isStack && otherItem.isLinked) {
                                // Unlink deactivated items
                                (otherItem as ImageResource).unlink()
                            }
                        }
                        // Mark as last activated
                        this.lastActivated = itemIdx
                    } else {
                        // Deactivate item, but keep last activated intact
                        item.isActive = false
                    }
                } else {
                    // Simply deactivate, unlink (if needed) and unset last activated item
                    item.isActive = false
                    if (item.isStack && item.isLinked) {
                        (item as ImageResource).unlink()
                    }
                    this.lastActivated = null
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
    padding: 80px 10px 10px 10px;
    width: 300px;
    height: calc(100% - 50px);
    margin-top: 0; /* Unset possible margin from another scope */
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
        background-color: var(--medigi-viewer-background-emphasize);
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
