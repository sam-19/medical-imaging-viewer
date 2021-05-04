/** MEDIGI VIEWER EDF SIGNAL MONTAGE
 * Class for handling DICOM waveforms (mostly biosignals).
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
 import { stringify } from 'postcss'
import { SignalMontage, SignalMontageChannel, SignalSetup } from '../../types/assets'

 class EdfSignalMontage implements SignalMontage {
    protected _label: string
    protected _name: string = 'Unknown'
    protected _channels: SignalMontageChannel[] = []

    constructor (label: string, name?: string, channels?: SignalMontageChannel[]) {
        // Generate a pseudo-random identifier for this object
        this._label = label
        if (name !== undefined) {
            this._name = name
        }
        if (channels) {
            this._channels = channels
        }
    }
    // Getters and setters
    get channels () {
        return this._channels
    }
    set channels (channels: SignalMontageChannel[]) {
        this._channels = channels
    }
    get label () {
        return this._label
    }
    set label (label: string) {
        this._label = label
    }
    get name () {
        return this._name
    }
    set name (name: string) {
        this._name = name
    }
    // Methods
    getAllSignals (signals: number[][], setup: SignalSetup) {
        let mapping = [] as number[][]
        // See if current channel mapping matches the setup
        if (setup !== this._cachedSetup) {
            // Use cached mapping
            mapping = this._cachedMapping
        } else {
            // Map and cache raw signal channel indices to montage channel indices
            montage_loop:
            for (const mChan of this._channels) {
                for (const sChan of setup.channels) {
                    if (mChan.label)
                }
            }
        }

    }
    mapChannels (setup: SignalSetup, config: any) {
        const labelMap: { label: string, index: number }[] = []
        // First map labels to correct channel indices
        label_loop:
        for (const cLabel of config.channelLabels) {
            for (const sChan of setup.channels) {
                if (cLabel === sChan.label) {
                    labelMap.push({ label: cLabel, index: sChan.index as number })
                    continue label_loop
                }
            }
        }
    }
 }
 export default EdfSignalMontage
