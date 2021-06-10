<template>
    <div :id="`${$store.state.appName}-medigi-viewer-ekg-sidebar`">
        <div class="medigi-viewer-sidebar-items">
            <ekg-sidebar-item v-for="(item, idx) in items" :key="`sidebaritem-${idx}-${item.id}`"
                :active="item.isActive"
                :channels="item.channels.length"
                :duration="item.duration"
                :id="item.id"
                :index="idx"
                :label="item.modality"
                :title="item.name"
                :type="item.type"
                v-on:toggle-active-item="toggleActiveItem"
            />
            <div :class="[
                'medigi-viewer-sidebar-loading',
                { 'medigi-viewer-hidden': !$store.state.loadingStudies }
            ]">
                <font-awesome-icon :icon="['fad', 'spinner-third']" spin></font-awesome-icon>
                {{ t('LOADING STUDIES') }}
            </div>
            <div :id="`${$store.state.appName}-medigi-viewer-ekg-dropzone`" :style="dropZoneStyles" class="medigi-viewer-dropzone"></div>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { MediaResource } from '../../types/common'

export default Vue.extend({
    props: {
        items: Array,
    },
    components: {
        EkgSidebarItem: () => import('./EegSidebarItem.vue'),
    },
    data () {
        return {
            dropZone: null as HTMLElement | null,
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
        /** Shorthand for component-specific translations */
        t: function (str: string, args?: any) {
            if (args) {
                return this.$t(`components.EEG.EegSidebar.${str}`, args)
            } else {
                return (this.$t('components.EEG.EegSidebar') as any)[str]
            }
        },
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
            const otherActive = [] as MediaResource[]
            // See if there are other active items
            for (const otherItem of this.items as MediaResource[]) {
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
                        if (!(this.items[curIdx] as MediaResource).isActive) {
                            (this.items[curIdx] as MediaResource).isActive = true
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
                    this.lastActivated = null
                }
            }
            this.$emit('element-status-changed')
        },
    },
    mounted () {
        // Set up file dropzone
        this.dropZone = document.getElementById(`${this.$store.state.appName}-medigi-viewer-ekg-dropzone`)
        if (this.dropZone) {
            this.dropZone.addEventListener('dragover', this.handleFileDrag, false)
            this.dropZone.addEventListener('drop', this.handleFileDrop, false)
            this.dropZone.addEventListener('dragleave', this.clearDropZoneHighlight, false)
        }
    },
})
</script>

<style>
.medigi-viewer-sidebar > div {
    position: relative;
    padding: 0 10px 10px 10px;
    width: 300px;
    height: calc(100% - 80px);
    margin-top: 80px;
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
    min-height: 140px;
}
    .medigi-viewer-dropzone.medigi-viewer-highlight {
        background-color: var(--medigi-viewer-background-emphasize);
    }
</style>
