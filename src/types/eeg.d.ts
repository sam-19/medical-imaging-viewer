/** MEDIGI VIEWER EEG TYPES
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

import { BiosignalResource } from './common'

interface EegResource extends BiosignalResource {
    activeMontage: EegMontage | null
    montages: EegMontage[]
    resolution: number
    setup: EegSetup | null
}

/**
 * Configuration for a single signal channel in SignalSetup.
 * @param label identifying label used to match signals in SignalMontage
 * @param name descriptive name for the channel
 * @param type signal type
 * @param index matched signal index in recording data, optional
 * @param avgRef is the raw signal already referenced to signal average (so we don't average twice), optional
 */
 interface EegSetupChannel {
    label: string
    name: string
    type?: 'eeg' | 'eog' | 'ekg'
    samplingRate?: number
    index?: number
    avgRef?: boolean
}
/**
 * Setup for interpreting a particular signal resource.
 * @param name descriptive name for the setup
 * @param channels configuration for each matched channel in the setup
 * @param expectedChannels channels expected to be present in the setup
 * @param missingChannels channels that should have been present, but were not found
 * @param unmatchedChannels channels that could not be matched to any expected channel
 */
interface EegSetup {
    name: string
    channels: EegSetupChannel[]
    missingChannels: EegSetupChannel[]
    unmatchedChannels: EegSetupChannel[]
}
/**
 * A single channel in montage configuration.
 * @param label identifying label for the channel
 * @param name descriptive name for the channel
 * @param active active channel index
 * @param reference reference channel indices; multiple reference channels will be averaged
 */
interface EegMontageChannel {
    label: string
    name: string
    active: number
    reference: number[]
    resolution: number
    offset: number
}
/**
 * Signal montage describes how a particular signal should be presented.
 * @param label identifying label for the montage
 * @param name descriptive name for the montage
 * @param channels configuration for channels in this montage
 * @param getAllSignals return calculated signals from the given signals in the given range ([starting index, ending index], optional)
 * @param getChannelSignal return calculated signal from the given for a given channel in the given range  ([starting index, ending index], optional)
 * @param mapChannels map montage channel indices according to given signal setup and montage config
 * @param resetChannels reset mapped channels
 */
interface EegMontage {
    label: string
    name: string
    channels: (EegMontageChannel | null)[]
    getAllSignals(signals: number[][], range?: number[]): number[][]
    getChannelSignal(signals: number[][], index: number, range?: number[]): number[]
    mapChannels(setup: EegSetup, config: any): void
    resetChannels(): void
}

export { EegMontage, EegMontageChannel, EegResource, EegSetup, EegSetupChannel }