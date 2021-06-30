<template>
    <div class="medimg-viewer-settings-modal">
        <div class="medimg-viewer-settings-modal-title">
            {{ t('Settings') }}
        </div>
        <!-- TABS -->
        <div class="medimg-viewer-settings-modal-tabs">
            <!-- Main settings tab is always available -->
            <div :class="[
                    'medimg-viewer-settings-modal-tab',
                    { 'medimg-viewer-settings-modal-tab-blurred': tab !== 'general' }
                ]"
                @click="selectTab('general')"
            >
                {{ t('General') }}
            </div>
            <!-- Specific tabs are only available in each scope -->
            <div v-if="scope === 'eeg'" :class="[
                    'medimg-viewer-settings-modal-tab',
                    { 'medimg-viewer-settings-modal-tab-blurred': tab !== 'eeg' }
                ]"
                @click="selectTab('eeg')"
            >
                {{ t('EEG') }}
            </div>
            <div v-if="scope === 'ekg'" :class="[
                    'medimg-viewer-settings-modal-tab',
                    { 'medimg-viewer-settings-modal-tab-blurred': tab !== 'ekg' }
                ]"
                @click="selectTab('ekg')"
            >
                {{ t('EKG') }}
            </div>
            <div v-if="scope === 'radiology'" :class="[
                    'medimg-viewer-settings-modal-tab',
                    { 'medimg-viewer-settings-modal-tab-blurred': tab !== 'radiology' }
                ]"
                @click="selectTab('radiology')"
            >
                {{ t('Radiology') }}
            </div>
            <div class="medimg-viewer-settings-modal-tabend">
                <label>
                    <input type="checkbox" v-model="saveSettings" />
                    {{ t('Save settings') }}
                </label>
            </div>
        </div>
        <div style="clear:both"></div>
        <!-- SETTINGS -->
        <div v-if="tab === 'eeg'" class="medimg-viewer-settings-modal-content">
            <div class="medimg-viewer-settings-modal-row">
                {{ t('EEG') }}
            </div>
            <div class="medimg-viewer-settings-modal-row">
                <div class="medimg-viewer-settings-modal-label">
                    {{ t('Signal polarity') }}
                </div>
                <div class="medimg-viewer-settings-modal-value">
                    <select v-model="eegSignalPolarity">
                        <option :value="-1">{{ t('Negative') }}</option>
                        <option :value="1">{{ t('Positive') }}</option>
                    </select>
                    &nbsp;
                </div>
            </div>
        </div>
        <div v-else-if="tab === 'ekg'" class="medimg-viewer-settings-modal-content">
            <div class="medimg-viewer-settings-modal-row">
                {{ t('EKG') }}
            </div>
        </div>
        <div v-else-if="tab === 'radiology'" class="medimg-viewer-settings-modal-content">
            <div class="medimg-viewer-settings-modal-row">
                {{ t('Radiology') }}
            </div>
        </div>
        <div v-else class="medimg-viewer-settings-modal-content">
            <div class="medimg-viewer-settings-modal-topic">
                {{ t('Language settings') }}
            </div>
            <div class="medimg-viewer-settings-modal-row">
                <div class="medimg-viewer-settings-modal-label">
                    {{ t('Interface language') }}
                </div>
                <div class="medimg-viewer-settings-modal-value">
                    <!-- TODO: Create config and fetch values from there -->
                    <select v-model="appLocale">
                        <option value="en">{{ t('English') }}</option>
                        <option value="fi">{{ t('Finnish') }}</option>
                    </select>
                    &nbsp;
                </div>
            </div>
            <hr />
            <div class="medimg-viewer-settings-modal-topic">
                {{ t('Display settings') }}
            </div>
            <div class="medimg-viewer-settings-modal-row">
                <div class="medimg-viewer-settings-modal-label">
                    {{ t('Screen PPI') }}
                    <font-awesome-icon :icon="['fad', 'question-circle']" style="cursor:help" :title="t('Screen PPI:help')" />
                </div>
                <div class="medimg-viewer-settings-modal-value">
                    <input type="number" min="72" max="1000" step="1" v-model="appPPI" />
                    <font-awesome-icon
                        :icon="['far', 'undo-alt']"
                        :title="t('Reset')"
                        style="cursor:pointer"
                        @click="appPPI = originalPPI"
                    />
                </div>
                <div class="medimg-viewer-settings-modal-ppi-scale" :style="ppiScaleStyle"></div>
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
            appPPI: this.$store.state.SETTINGS.screenPPI,
            appLocale: this.$store.state.SETTINGS.locale,
            eegSignalPolarity: this.$store.state.SETTINGS.eeg.signalPolarity,
            originalPPI: this.$store.state.SETTINGS.screenPPI,
            saveSettings: true,
            tab: 'general',
        }
    },
    watch: {
        appPPI: function (value: number, old: number) {
            this.updateSetting('screenPPI', value)
        },
        appLocale: function (value: string, old: string) {
            this.updateSetting('locale', value)
        },
        eegSignalPolarity: function (value: number, old: number) {
            this.updateSetting('eeg.signalPolarity', value)
        },
        scope: function (value: string, old: string) {
            // Change settings tab to match new scope
            this.tab = value
        },
    },
    computed: {
        ppiScaleStyle () {
            const width = this.$store.state.SETTINGS.screenPPI/2.56*5
            if (width > 383) {
                // Don't exceed field maximum width
                return `width: 383px; background-color: red`
            }
            return `width: ${width}px`
        },
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
        updateSetting: function (setting: string, value: any) {
            this.$store.commit('set-settings-value', { field: setting, value: value })
            if (!this.saveSettings) {
                return
            }
            const localSettings = JSON.parse(window.localStorage.getItem('medimgViewerSettings') || '{}')
            localSettings[setting as keyof typeof localSettings] = value
            window.localStorage.setItem('medimgViewerSettings', JSON.stringify(localSettings))
        },
    },
})

</script>

<style scoped>

label {
    cursor: pointer;
}
.medimg-viewer-settings-modal {
    width: 620px;
    margin: 30px auto;
    padding: 10px;
    height: calc(100% - 60px);
    background-color: var(--medimg-viewer-background);
}
.medimg-viewer-settings-modal-title {
    height: 48px;
    line-height: 40px;
    font-size: 32px;
}
.medimg-viewer-settings-modal-tabs {
    display: flex;
    height: 32px;
    line-height: 32px;
}
    .medimg-viewer-settings-modal-tab {
        flex-grow: 0;
        padding: 0 10px;
        border: 1px solid var(--medimg-viewer-border-faint);
        border-right: none;
        border-bottom: none;
        cursor: pointer;
    }
        .medimg-viewer-settings-modal-tab-blurred {
            border-bottom: 1px solid var(--medimg-viewer-border-faint);
            color: var(--medimg-viewer-text-faint);
        }
    .medimg-viewer-settings-modal-tabend {
        flex-grow: 1;
        border: 1px solid var(--medimg-viewer-border-faint);
        border-top: none;
        border-right: none;
        text-align: right;
    }
.medimg-viewer-settings-modal-content {
    height: calc(100% - 80px);
    padding: 10px;
    border: 1px solid var(--medimg-viewer-border-faint);
    border-top: none !important;
}
    .medimg-viewer-settings-modal-content > hr {
        border-color: var(--medimg-viewer-border-faint);
        border-style: solid none none;
        border-width: 1px 0px 0px;
    }
    .medimg-viewer-settings-modal-topic {
        height: 36px;
        line-height: 36px;
        font-variant: small-caps;
    }
    .medimg-viewer-settings-modal-row {
        height: 36px;
        line-height: 36px;
    }
        .medimg-viewer-settings-modal-label {
            display: inline-block;
            width: 190px;
        }
        .medimg-viewer-settings-modal-value {
            display: inline-block;
            width: 383px;
        }
            .medimg-viewer-settings-modal-value input[type=text],
            .medimg-viewer-settings-modal-value input[type=number],
            .medimg-viewer-settings-modal-value select {
                height: 24px;
                width: 200px;
            }
        .medimg-viewer-settings-modal-ppi-scale {
            height: 10px;
            margin: 5px 0 0 194px;
            border: 1px solid var(--medimg-viewer-border-faint);
            background-color: var(--medimg-viewer-background-highlight);
        }

</style>
