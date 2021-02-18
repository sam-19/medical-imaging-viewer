<template>
    <div :id="`${$store.state.appName}-medigi-viewer-ekg-sidebar`">
        <div class="medigi-viewer-sidebar-items">
            <!--
            <imaging-sidebar-item v-for="(item, idx) in items" :key="`sidebaritem-${idx}-${item.id}`"
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
            -->
            <div :id="`${$store.state.appName}-medigi-viewer-ekg-dropzone`" :style="dropZoneStyles" class="medigi-viewer-dropzone"></div>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
    props: {
        items: Array,
    },
    computed: {
        dropZoneStyles () {
            const heightTaken = 10 + 60 + 60 + this.items.length*149 + 20
            return `width: 100%; height: calc(100% - ${heightTaken}px`
        },
    },
    methods: {
        toggleActiveItem: function (index: number) {

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
