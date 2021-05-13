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
            <div :class="[
                'medigi-viewer-sidebar-loading',
                { 'medigi-viewer-hidden': !loadingStudies }
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
import { MediaResource } from '../../types/assets'

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
        background-color: var(--medigi-viewer-background-highlight);
    }
</style>
