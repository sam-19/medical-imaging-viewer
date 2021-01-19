<template>
    <div :id="`${appName}-medigi-viewer-sidebar`">
        <div class="medigi-viewer-sidebar-dropdown">
            <span>SELECT RESOURCE</span>
            <ul>
                <li>OPTION 1</li>
                <li>OPTION 2</li>
                <li>OPTION 3</li>
                <li>OPTION 4</li>
            </ul>
        </div>
        <SidebarItem v-for="(item, idx) in items" :key="`sidebaritem${idx}`"
            :count="item.size"
            :label="item.modality"
            :title="item.name"
            :type="item.type"
            :cover="item.coverImage"
        />
        <div :id="`${appName}-medigi-viewer-dropzone`" :style="dropZoneStyles" class="medigi-viewer-dropzone"></div>
        <div :id="`${$root.appName}-medigi-viewer-statusbar`" class="medigi-viewer-statusbar">
            <span>{{ $t('Cache statistics') }}</span>
            <span>{{ $store.state.cacheStatus.count }} {{ $t('images') }}</span>
            <span v-if="$store.state.cacheStatus.size">
                - {{ Math.round(1000*$store.state.cacheStatus.size/$store.state.cacheStatus.max)/10 }}% {{ $t('usage') }}
            </span>
        </div>
    </div>
</template>

<script lang="ts">

import Vue from 'vue'
import { MediaResource } from '../types/assets'

export default Vue.extend({
    components: {
        SidebarItem: () => import('./SidebarItem.vue'),
    },
    props: {
        appName: String,
        items: Array,
    },
    data () {
        return {
            dropZone: null as HTMLElement | null,
            mediaItems: [] as MediaResource[],
        }
    },
    computed: {
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
        }
    },
    mounted () {
        // Set up DICOM file dropzone
        this.dropZone = document.getElementById(`${this.appName}-medigi-viewer-dropzone`)
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
    padding: 10px;
}
.medigi-viewer-sidebar-dropdown {
    position: relative;
    min-height: 60px;
    width: 100%;
    border: solid 2px var(--medigi-viewer-border);
    border-radius: 5px;
    font-size: 24px;
    line-height: 56px;
    font-size: 16px;
    cursor: pointer;
    z-index: 1;
}
    .medigi-viewer-sidebar-dropdown > span {
        margin: 0 10px;
    }
    .medigi-viewer-sidebar-dropdown > ul {
        display: none;
        width: 100%;
        list-style-type: none;
        margin-block-start: 0;
        margin-block-end: 0;
        padding-inline-start: 0;
    }
        .medigi-viewer-sidebar-dropdown > ul > li {
            height: 40px;
            line-height: 40px;
            padding: 0 10px;
        }
            .medigi-viewer-sidebar-dropdown > ul > li:hover {
                background-color: var(--medigi-viewer-background-highlight);
            }
    .medigi-viewer-sidebar-dropdown:hover > ul {
        display: block;
    }
.medigi-viewer-dropzone {
    margin: 10px 0;
}
    .medigi-viewer-dropzone.medigi-viewer-highlight {
        background-color: var(--medigi-viewer-background-highlight);
    }
.medigi-viewer-statusbar {
    position: absolute;
    bottom: 0;
    height: 60px;
    line-height: 20px;
    padding: 10px 0;
    color: var(--medigi-viewer-text-faint);
}
    .medigi-viewer-statusbar > span:nth-child(1) {
        display: block;
    }
</style>
