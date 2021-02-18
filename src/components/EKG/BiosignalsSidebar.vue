<template>
    <div :id="`${$store.state.appName}-medigi-viewer-biosignals-sidebar`">
        <div class="medigi-viewer-sidebar-items">
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
            <div :id="`${$store.state.appName}-medigi-viewer-dropzone`" :style="dropZoneStyles" class="medigi-viewer-dropzone"></div>
        </div>
        <div :id="`${$root.$store.state.appName}-medigi-viewer-statusbar`" class="medigi-viewer-statusbar">
            <span>{{ $t('Cache status') }}</span>
            <span>{{ cacheImages }} {{ cacheImages === 1 ? $t('image') : $t('images') }}</span>
            <span v-if="cacheSize">
                - {{ cacheUtil }}% {{ $t('usage') }}
            </span>
        </div>
    </div>
</template>

<script>
export default {

}
</script>

<style>

</style>
