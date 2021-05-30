<template>
    <div class="medigi-viewer-settings-modal">
        <div class="medigi-viewer-settings-modal-title">
            {{ t('Settings') }}
        </div>
        <!-- TABS -->
        <!-- First tab depends on scope, and that is the default open tab -->
        <div class="medigi-viewer-settings-modal-tabs">
            <div v-if="scope === 'eeg'" :class="[
                    'medigi-viewer-settings-modal-tab',
                    { 'medigi-viewer-settings-modal-tab-blurred': tab !== 'eeg' }
                ]"
                @click="selectTab('eeg')"
            >
                {{ t('EEG') }}
            </div>
            <div v-if="scope === 'ekg'" :class="[
                    'medigi-viewer-settings-modal-tab',
                    { 'medigi-viewer-settings-modal-tab-blurred': tab !== 'ekg' }
                ]"
                @click="selectTab('ekg')"
            >
                {{ t('EKG') }}
            </div>
            <div v-if="scope === 'radiology'" :class="[
                    'medigi-viewer-settings-modal-tab',
                    { 'medigi-viewer-settings-modal-tab-blurred': tab !== 'radiology' }
                ]"
                @click="selectTab('radiology')"
            >
                {{ t('Radiology') }}
            </div>
            <!-- Main settings tab is always available -->
            <div :class="[
                    'medigi-viewer-settings-modal-tab',
                    { 'medigi-viewer-settings-modal-tab-blurred': tab !== 'general' }
                ]"
                @click="selectTab('general')"
            >
                {{ t('General') }}
            </div>
            <div class="medigi-viewer-settings-modal-tabend">&nbsp;</div>
        </div>
        <div style="clear:both"></div>
        <!-- SETTINGS -->
        <div v-if="tab === 'eeg'" class="medigi-viewer-settings-modal-content">
            <div class="medigi-viewer-settings-modal-row">
                {{ t('EEG') }}
            </div>
        </div>
        <div v-else-if="tab === 'ekg'" class="medigi-viewer-settings-modal-content">
            <div class="medigi-viewer-settings-modal-row">
                {{ t('EKG') }}
            </div>
        </div>
        <div v-else-if="tab === 'radiology'" class="medigi-viewer-settings-modal-content">
            <div class="medigi-viewer-settings-modal-row">
                {{ t('Radiology') }}
            </div>
        </div>
        <div v-else class="medigi-viewer-settings-modal-content">
            <div class="medigi-viewer-settings-modal-row">
                <div class="medigi-viewer-settings-modal-label">
                    {{ t('Language') }}
                </div>
                <div class="medigi-viewer-settings-modal-value">
                    <!-- TODO: Create config and fetch values from there -->
                    <select v-model="appLocale">
                        <option value="en">{{ t('English') }}</option>
                        <option value="fi">{{ t('Finnish') }}</option>
                    </select>
                    &nbsp;
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">

import Vue from 'vue'

export default Vue.extend({
    props: {
        scope: String,
    },
    data () {
        return {
            appLocale: this.$store.state.SETTINGS.locale,
            tab: this.scope || 'general',
        }
    },
    watch: {
        appLocale: function (value: string, old: string) {
            this.$store.commit('set-settings-value', { field: 'locale', value: value })
        }
    },
    methods: {
        /** Shorthand for component-specific translations */
        t: function (str: string, args?: any) {
            if (args) {
                return this.$t(`components.Settings.${str}`, args)
            } else {
                return (this.$t('components.Settings') as any)[str]
            }
        },
        selectTab: function (tab: string) {
            if (this.tab !== tab) {
                this.tab = tab
            }
        },
    },
})

</script>

<style scoped>

.medigi-viewer-settings-modal {
    width: 600px;
    margin: 30px auto;
    height: calc(100% - 60px);
}
.medigi-viewer-settings-modal-title {
    height: 64px;
    line-height: 64px;
    font-size: 32px;
}
.medigi-viewer-settings-modal-tabs {
    display: flex;
}
    .medigi-viewer-settings-modal-tab {
        flex-grow: 0;
        padding: 5px 10px;
        float: left;
        border: 1px solid var(--medigi-viewer-border);
        border-right: none;
        border-bottom: none;
        background-color: var(--medigi-viewer-background);
        cursor: pointer;
    }
        .medigi-viewer-settings-modal-tab-blurred {
            border-bottom: 1px solid var(--medigi-viewer-border);
            color: var(--medigi-viewer-text-faint);
        }
    .medigi-viewer-settings-modal-tabend {
        flex-grow: 1;
        border: 1px solid var(--medigi-viewer-border);
        border-top: none;
        border-right: none;
    }
.medigi-viewer-settings-modal-content {
    padding: 10px;
    border: 1px solid var(--medigi-viewer-border);
    border-top: none !important;
    background-color: var(--medigi-viewer-background);
}
    .medigi-viewer-settings-modal-row {
        height: 36px;
        line-height: 36px;
    }
        .medigi-viewer-settings-modal-label {
            display: inline-block;
            width: 190px;
        }
        .medigi-viewer-settings-modal-value {
            display: inline-block;
            width: 383px;
        }
            .medigi-viewer-settings-modal-value input[type=text],
            .medigi-viewer-settings-modal-value select {
                height: 24px;
                width: 200px;
            }

</style>
