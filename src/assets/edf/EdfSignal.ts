/** MEDIGI VIEWER EDF SIGNAL
 * Class for handling DICOM waveforms (mostly biosignals).
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import { SignalResource, SignalChannel, SignalMontage, SignalSetup } from '../../types/assets'

class EdfSignal implements SignalResource {
    protected _active: boolean = false
    protected _annotations: any[] = []
    protected _channels: SignalChannel[] = []
    protected _montages: SignalMontage[] = []
    protected _samples: number = 0
    protected _setup: SignalSetup | null = null
    protected _id: string
    protected _name: string
    protected _resolution: number = 0
    protected _type: string = 'unknown'
    protected _url: string = ''

    constructor (name: string, data?: object, loader?: string) {
        // Generate a pseudo-random identifier for this object
        this._id = Math.random().toString(36).substr(2, 8)
        this._name = name
        if (data) {
            this.extractSignalsFromEdfData(data, loader || undefined)
            console.log("data", data)
        }
    }
    // Getters and setters
    get annotations () {
        return this._annotations
    }
    get channels () {
        return this._channels
    }
    get id () {
        return this._id
    }
    get isActive () {
        return this._active
    }
    set isActive (val: boolean) {
        this._active = val
    }
    get montages () {
        return this._montages
    }
    set montages (montages: SignalMontage[]) {
        this._montages = montages
    }
    get name () {
        return this._name
    }
    set name (name: string) {
        this._name = name
    }
    get resolution () {
        return this._resolution
    }
    get sampleCount () {
        return this._samples
    }
    get setup () {
        return this._setup
    }
    set setup (setup: SignalSetup | null) {
        this._setup = setup
    }
    get type () {
        return this._type.split(':')[0]
    }
    set type (type: string) {
        this._type = type
    }
    get url () {
        return this._url
    }
    set url (url: string) {
        this._url = url
    }

    extractSignalsFromEdfData (data: any, loader?: string) {
        // Select method based on file loader
        // For automatic determination of study modality
        let eegSignalCount = 0
        let polySignalCount = 0
        if (loader === 'edf-decoder') {
            let totalSamplesPerRecord = 0
            // We should not have loaded large files with decoder, so cache the whole signal data
            const totalRecords = data.getNumberOfRecords()
            for (let i=0; i<data.getNumberOfSignals(); i++) {
                // Try to determine sensitivity from unit
                const unitLow = data.getSignalPhysicalUnit(i).toLowerCase()
                const sensitivity = unitLow === 'uv' || unitLow === 'µv' ? 1_000_000
                                    : unitLow === 'mv' ? 1000 : unitLow === 'v' ?  1 : 0
                const chanData = {
                    label: data.getSignalLabel(i) || '',
                    resolution: data.getSignalSamplingFrequency(i) || 0,
                    sensitivity: sensitivity,
                    signal: [...data.getPhysicalSignalConcatRecords(i, 0, totalRecords)],
                    unit: data.getSignalPhysicalUnit(i) || '',
                    samplesPerRecord: data.getSignalNumberOfSamplesPerRecord(i) || 0,
                    sampleCount: 0,
                    physicalMin: data.getSignalPhysicalMin(i) || 0,
                    physicalMax: data.getSignalPhysicalMax(i) || 0,
                    filter: data.getSignalPrefiltering(i) || '',
                    transducer: data.getSignalTransducerType(i) || '',
                }
                chanData.sampleCount = chanData.signal.length // Here we have all samples cached already
                totalSamplesPerRecord += chanData.samplesPerRecord || 0
                if (chanData.label.toLowerCase().indexOf('eeg') !== -1) {
                    eegSignalCount++
                } else if (
                    chanData.label.toLowerCase().indexOf('eog') !== -1 ||
                    chanData.label.toLowerCase().indexOf('loc') !== -1 ||
                    chanData.label.toLowerCase().indexOf('roc') !== -1
                ) {
                    polySignalCount++
                }
                this._channels[i] = chanData
            }
            // No reason to keep the original data
            data = null
        }
        // Try to infer type from channel types
        if (this._type === 'unknown') {
            if (eegSignalCount/polySignalCount >= 3) {
                // At least 3/4 of the signals are EEG, this is probably an EEG recording
                this._type = 'eeg'
            }
        }
    }
    getAllMontageSignals (montage: number | string, range: number[]) {
        if (this._setup === null || !this._montages.length) {
            return [] as number[][]
        }
        if (typeof montage === 'string') {
            // Match montage label to montage index
            for (let i=0; i<this._montages.length; i++) {
                if (this._montages[i].label === montage) {
                    montage = i
                    break
                } else if (i === this._montages.length - 1) {
                    // No match found
                    return [] as number[][]
                }
            }
        }
        // Calculate signals only for the part that we need
        const signals = this._channels.map((chan) => chan.signal.splice(range[0], range[1]))
        return this._montages[montage as number].getAllSignals(signals, this._setup)
    }
    getAllRawSignals(range: number[]) {
        const signals = [] as number[][]
        if (range.length !== 2) {
            return signals
        }
        if (this._setup === null) {
            // If there is no setup loaded, just return the actual signal data
            for (const chan of this._channels) {
                signals.push(chan.signal.slice(range[0], range[1]))
            }
        } else {
            // Match setup channels to raw signal data channels
            for (const chan of this._setup.channels) {
                signals.push(this._channels[chan.index as number].signal.slice(range[0], range[1]))
            }
        }
        return signals
    }
    getMontageSignal(montage: number | string, range: number[], channel: number | string) {
        if (this._setup === null || !this._montages.length) {
            return [] as number[]
        }
        if (typeof montage === 'string') {
            // Match montage label to montage index
            for (let i=0; i<this._montages.length; i++) {
                if (this._montages[i].label === montage) {
                    montage = i
                    break
                } else if (i === this._montages.length - 1) {
                    // No match found
                    return [] as number[]
                }
            }
        }
        if (typeof channel === 'string') {
            // Match channel label to channel index
            for (let i=0; i<this._montages[montage as number].channels.length; i++) {
                if (this._montages[montage as number].channels[i].label === channel) {
                    channel = i
                    break
                } else if (i === this._montages[montage as number].channels.length - 1) {
                    // No match found
                    return [] as number[]
                }
            }
        }
        const signals = this._channels.map((chan) => chan.signal.splice(range[0], range[1]))
        return this._montages[montage as number].getChannelSignal(signals, this._setup, channel as number)
    }
    getRawSignal(range: number[], channel: number | string) {
        if (typeof channel === 'string') {
            // Match channel label to channel index
            for (let i=0; i<this._channels.length; i++) {
                if (this._channels[i].label === channel) {
                    channel = i
                    break
                } else if (i === this._channels.length - 1) {
                    // No match found
                    return [] as number[]
                }
            }
        }
        if (range.length !== 2 || channel < 0 || channel >= this._channels.length) {
            return [] as number[]
        }
        if (this._setup === null) {
            // If there is no setup loaded, just return the actual signal data
            return this._channels[channel as number].signal.slice(range[0], range[1])
        } else {
            // Match setup channels to raw signal data channels
            return this._channels[this._setup.channels[channel as number].index as number]
                        .signal.slice(range[0], range[1])
        }
    }
}
export default EdfSignal
export { SignalResource }
