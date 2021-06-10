/** MEDICAL IMAGING VIEWER EDF SIGNAL
 * Class for handling DICOM waveforms (mostly biosignals).
 * @package    medimg-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import { BiosignalResource, BiosignalChannel } from '../../types/common'
import { EegResource, EegMontage, EegSetup } from '../../types/eeg'
import Fili from 'fili'
import EdfSignalMontage from './EdfSignalMontage'
import EdfEegSetup from './EdfSignalSetup'

class EdfEegRecord implements EegResource {
    protected _active: boolean = false
    protected _annotations: any[] = []
    protected _channels: BiosignalChannel[] = []
    protected _montages: EegMontage[] = []
    protected _activeMontage: EegMontage | null = null
    protected _rawMontage: EegMontage | null = null
    protected _samples: number = 0
    protected _setups: EegSetup[] = []
    protected _activeSetup: EegSetup | null = null
    protected _id: string
    protected _name: string
    protected _maxSamplingRate: number = 0 // Maximum resolution in this recording
    protected _type: string = 'unknown'
    protected _url: string = ''
    protected _viewStart: number = 0
    // Signal filtering
    private iirCalculator = new Fili.CalcCascades()

    constructor (name: string, data?: object, loader?: string) {
        // Generate a pseudo-random identifier for this object
        this._id = Math.random().toString(36).substr(2, 8)
        this._name = name
        if (data) {
            this.extractSignalsFromEdfData(data, loader || undefined)
        }
    }
    // Getters and setters
    get activeMontage () {
        return this._activeMontage
    }
    get annotations () {
        return this._annotations
    }
    get channels () {
        return this._channels
    }
    get duration () {
        return this._samples/this.maxSamplingRate
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
    set montages (montages: EegMontage[]) {
        this._montages = montages
    }
    get name () {
        return this._name
    }
    set name (name: string) {
        this._name = name
    }
    get maxSamplingRate () {
        return this._maxSamplingRate
    }
    get sampleCount () {
        return this._samples
    }
    get setup () {
        return this._activeSetup
    }
    set setup (setup: EegSetup | null) {
        this._activeSetup = setup
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
    get viewStart () {
        return this._viewStart
    }
    set viewStart (start: number) {
        this._viewStart = start
    }
    // Methods
    addMontage (label: string, name: string, config?: any) {
        if (this._activeSetup) {
            const montage = new EdfSignalMontage(label, name)
            if (config) {
                // Use config to add a montage
                montage.mapChannels(this._activeSetup, config)
            } else if (!this._activeMontage) {
                // Add first montage as an 'as recorded' montage
                montage.mapChannels(this._activeSetup, null)
                this._activeMontage = montage
            }
            this._montages.push(montage)
        }
    }
    addSetup (id: string, config?: any) {
        this._setups.push(new EdfEegSetup(id, this._channels, config))
        if (this._activeSetup === null) {
            this._activeSetup = this._setups[0]
            // Create an 'as recorded' montage
            this._rawMontage = new EdfSignalMontage('raw-signals', 'As recorded')
            this._rawMontage.mapChannels(this._activeSetup, null)
        }
        console.log(this._activeSetup)
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
                    name: data.getSignalLabel(i) || '',
                    samplingRate: data.getSignalSamplingFrequency(i) || 0,
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
                // Keep track of maximum resolution and sample count
                if (chanData.samplingRate > this._maxSamplingRate) {
                    this._maxSamplingRate = chanData.samplingRate
                }
                if (chanData.sampleCount > this._samples) {
                    this._samples = chanData.sampleCount
                }
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
        this.addMontage('as_recorded', 'As recorded')
    }
    filterSignal (signal: number[], fs: number, hp: number, lp: number) {
        // Apply filtering if needed
        const bw = Math.log2(lp/hp)*2
        const fc = (lp-hp)/2
        const iirFilterCoeffs = this.iirCalculator.bandpass({
            order: 3,
            characteristic: 'butterworth',
            Fs: fs,
            Fc: fc,
            BW: bw,
        })
        const iirFilter = new Fili.IirFilter(iirFilterCoeffs)
        return iirFilter.filtfilt(signal)
    }
    getAllMontageSignals (range: number[], config?: any) {
        console.log(config)
        if (this._activeSetup === null || !this._activeMontage || this._activeMontage.label === 'raw-signals') {
            return this.getAllRawSignals(range, config, true)
        }
        const filtPad = (config?.highpass || config?.lowpass) && config?.filterPadding ? config.filterPadding : 0
        const filter = [range[0] - filtPad, range[1] + filtPad]
        // Calculate signals only for the part that we need
        const signals = this._channels.map((chan) => {
            const chanSignal = chan.signal.slice(
                Math.max(0, Math.floor(chan.samplingRate*filter[0])),
                Math.min(Math.ceil(chan.samplingRate*filter[1]), chan.signal.length) + 1
            )
            if (!config?.highpass && !config?.lowpass) {
                return chanSignal
            }
            const startPad = Math.floor((range[0] - filter[0])*chan.samplingRate)
            const endPad = Math.floor((filter[1] - range[1])*chan.samplingRate)
            return [...Array(startPad).fill(0), ...chanSignal, ...Array(endPad).fill(0)]
        })
        let i = 0
        const computedSigs = this._activeMontage.getAllSignals(signals).map((sig) => {
            if (!config?.highpass && !config?.lowpass) {
                return sig
            }
            const fs = this.activeMontage?.channels[i]?.samplingRate || this.maxSamplingRate
            const startPad = Math.floor((range[0] - filter[0])*fs)
            return this.filterSignal(sig, fs, config.highpass, config.lowpass)
                        .slice(startPad, startPad + sig.length + 1)
        })
        return computedSigs
    }
    getAllRawSignals(range: number[], config?: any, asRec=false) {
        const signals = [] as number[][]
        if (range.length !== 2) {
            return signals
        }
        const filtPad = (config?.highpass || config?.lowpass) && config?.filterPadding ? config.filterPadding : 0
        const filter = [range[0] - filtPad, range[1] + filtPad]
        if (this._activeSetup === null || asRec) {
            // If there is no setup loaded, just return the actual signal data
            for (const chan of this._channels) {
                const chanSignal = chan.signal.slice(
                    Math.max(0, Math.floor(chan.samplingRate*filter[0])),
                    Math.min(Math.ceil(chan.samplingRate*filter[1]), chan.signal.length) + 1
                )
                if (!config?.highpass && !config?.lowpass) {
                    signals.push(chanSignal)
                    continue
                }
                const startPad = Math.floor((range[0] - filter[0])*chan.samplingRate)
                const endPad = Math.floor((filter[1] - range[1])*chan.samplingRate)
                console.log(startPad, endPad)
                signals.push(this.filterSignal(
                    [...Array(startPad).fill(0), ...chanSignal, ...Array(endPad).fill(0)],
                    chan.samplingRate, config.highpass, config.lowpass
                ).slice(startPad, startPad + chanSignal.length + 1))
            }
        } else {
            // Match setup channels to raw signal data channels
            for (const chan of this._activeSetup.signals) {
                const fs = this._channels[chan.index as number].samplingRate
                const chanSignal = this._channels[chan.index as number].signal.slice(
                    Math.floor(fs*filter[0]), Math.ceil(fs*filter[1]) + 1
                )
                if (!config?.highpass && !config?.lowpass) {
                    signals.push(chanSignal)
                    continue
                }
                const startPad = Math.floor((range[0] - filter[0])*fs)
                const endPad = Math.floor((filter[1] - range[1])*fs)
                signals.push(this.filterSignal(
                    [...Array(startPad).fill(0), ...chanSignal, ...Array(endPad).fill(0)],
                    fs, config.highpass, config.lowpass
                ).slice(startPad, startPad + chanSignal.length + 1))
            }
        }
        return signals
    }
    getMontageSignal(range: number[], channel: number | string, config?: any) {
        if (this._activeSetup === null || !this._activeMontage) {
            return this.getRawSignal(range, channel)
        }
        // Calculate signal offsets if config is provided
        this._activeMontage.calculateSignalOffsets(config)
        if (typeof channel === 'string') {
            // Match channel label to channel index
            for (let i=0; i<this._activeMontage.channels.length; i++) {
                if (this._activeMontage.channels[i]?.label === channel) {
                    channel = i
                    break
                } else if (i === this._activeMontage.channels.length - 1) {
                    // No match found
                    return [] as number[]
                }
            }
        }
        const signals = this._channels.map((chan) => chan.signal.splice(
                            Math.floor(chan.samplingRate*range[0]),
                            Math.ceil(chan.samplingRate*range[1]) + 1
                        ))
        return this._activeMontage.getChannelSignal(signals, channel as number)
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
        if (this._activeSetup === null) {
            const res = this._channels[channel as number].samplingRate
            // If there is no setup loaded, just return the actual signal data
            return this._channels[channel as number].signal.slice(
                            Math.floor(res*range[0]), Math.ceil(res*range[1]) + 1
                        )
        } else {
            // Match setup channels to raw signal data channels
            const res = this._channels[this._activeSetup.signals[channel as number].index as number].samplingRate
            return this._channels[this._activeSetup.signals[channel as number].index as number]
                        .signal.slice(Math.floor(res*range[0]), Math.ceil(res*range[1]) + 1)
        }
    }
    setActiveMontage (montage: number | string, ) {
        if (typeof montage === 'string') {
            // Match montage label to montage index
            for (let i=0; i<this._montages.length; i++) {
                if (this._montages[i].label === montage) {
                    montage = i
                    break
                } else if (i === this._montages.length - 1) {
                    // No match found
                    return
                }
            }
        } else if (montage === null) {
            this._activeMontage = this._rawMontage
            return
        }
        if (montage >= 0 && montage < this._montages.length) {
            this._activeMontage = this._montages[montage as number]
        }
    }
}
export default EdfEegRecord
export { EegResource }
