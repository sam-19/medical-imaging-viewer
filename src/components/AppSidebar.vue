<template>
    <div :id="`${appName}-medigi-viewer-sidebar`">
        <div class="medigi-viewer-sidebar-dropdown">
            <span>DROP A FILE BELOW TO START</span>
            <ul>
                <!--<li>LIST OF OPTIONS</li>-->
            </ul>
        </div>
        <div class="medigi-viewer-sidebar-items">
            <SidebarItem v-for="(item, idx) in items" :key="`sidebaritem-${idx}`"
                :count="item.size"
                :cover="item.coverImage"
                :id="item.id"
                :label="item.modality"
                :stack="item.isStack"
                :title="item.name"
                :type="item.type"
            />
            <div :id="`${appName}-medigi-viewer-dropzone`" :style="dropZoneStyles" class="medigi-viewer-dropzone"></div>
            <div :id="`${$root.appName}-medigi-viewer-statusbar`" class="medigi-viewer-statusbar">
                <span>{{ $t('Cache status') }}</span>
                <span>{{ cacheImages }} {{ cacheImages === 1 ? $t('image') : $t('images') }}</span>
                <span v-if="cacheSize">
                    - {{ cacheUtil }}% {{ $t('usage') }}
                </span>
            </div>
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
        activeItems: Array,
    },
    data () {
        return {
            dropZone: null as HTMLElement | null,
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
    position: relative;
    padding: 0 10px 10px 10px;
    width: 300px;
    height: calc(100% - 70px);
    margin-top: 70px;
}
.medigi-viewer-sidebar-dropdown {
    position: absolute;
    top: -60px;
    min-height: 60px;
    width: 280px;
    border: solid 2px var(--medigi-viewer-border);
    border-radius: 5px;
    background-color: var(--medigi-viewer-background);
    font-size: 24px;
    line-height: 56px;
    font-size: 16px;
    cursor: pointer;
    opacity: 0.8;
    z-index: 1;
}
    .medigi-viewer-sidebar-dropdown:hover {
        opacity: 1.0;
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
.medigi-viewer-sidebar-items {
    display: flex;
    flex-direction: column;
    height: 100%;
}
.medigi-viewer-dropzone {
    flex-grow: 1;
    margin: 10px 0;
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
