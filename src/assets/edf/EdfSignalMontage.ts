/** MEDICAL IMAGING STUDY VIEWER EDF SIGNAL MONTAGE
 * Class for handling DICOM waveforms (mostly biosignals).
 * @package    medimg-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import { EegMontage, EegMontageChannel, EegSetup } from '../../types/eeg'
const defaults = {
    "10-20": {
        db: require('./default_montages/10-20/db.json'),
        raw: require('./default_montages/10-20/raw.json'),
    },
}

 class EdfEegMontage implements EegMontage {
    protected _label: string
    protected _name: string = 'Unknown'
    protected _channels: EegMontageChannel[] = []
    protected _config: any =  null

    constructor (label: string, name?: string) {
        // Generate a pseudo-random identifier for this object
        this._label = label
        if (name !== undefined) {
            this._name = name
        }
    }
    // Getters and setters
    get channels () {
        return this._channels
    }
    set channels (channels: EegMontageChannel[]) {
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
    getAllSignals (signals: number[][], range?: number[], config?: any, onlyChannels: number[] = []) {
        const derivedSignals = []
        const avgMap = [] as number[] // Only calculate averages once
        // Filter channels, if needed
        const channels = onlyChannels.length ? [] as EegMontageChannel[] : this._channels
        for (const c of onlyChannels) {
            channels.push(this._channels[c])
        }
        for (const chan of channels) {
            if (chan.active === null) {
                derivedSignals.push([])
                continue
            }
            // Convert range from seconds to current channe datapoint indices
            let chanRange = (range && range.length === 2)
                            ? [range[0]*chan.samplingRate, (range[1] || 0)*chan.samplingRate]
                            : null
            if (!chan.reference.length) {
                const sigs = chanRange === null ? signals[chan.active]
                             : signals[chan.active].slice(chanRange[0], chanRange[1])
                if (chan.amplification !== 1) {
                    // Need to apply amplification
                    for (let i=0; i<sigs.length; i++) {
                        sigs[i] = sigs[i]*chan.amplification
                    }
                }
                derivedSignals.push(sigs)
                continue
            }
            // Check that given range is valid
            if (chanRange === null) {
                chanRange = [0, signals[chan.active].length]
            } else {
                if (chanRange[0] < 0 || chanRange[0] > signals[chan.active].length) {
                    chanRange[0] = 0
                }
                if (chanRange[1] < 0 || chanRange[1] > signals[chan.active].length || chanRange[1] < chanRange[0]) {
                    chanRange[1] = signals[chan.active].length
                }
            }
            // Need to calculate signal relative to reference(s), one datapoint at a time.
            // Check that active signal and all reference signals have the same length.
            const refs = [] as number[]
            for (const ref of chan.reference) {
                if (signals[chan.active].length === signals[ref].length) {
                    refs.push(ref)
                }
            }
            const derivSig = []
            let refAvg = 0
            for (let i=chanRange[0]; i<chanRange[1]; i++) {
                if (avgMap[i] !== undefined) {
                    refAvg = avgMap[i]
                } else {
                    if (refs.length > 1) {
                        for (const ref of refs) {
                            refAvg += signals[ref][i]
                        }
                        refAvg /= refs.length
                        avgMap[i] = refAvg
                    } else if (!refs.length) {
                        refAvg = 0
                    } else {
                        refAvg = signals[refs[0]][i]
                    }
                }
                derivSig.push((signals[chan.active][i] - refAvg)*chan.amplification)
            }
            derivedSignals.push(derivSig)
        }
        return derivedSignals
    }
    getChannelSignal (signals: number[][], channel: number | string, range?: number[], config?: any) {
        // This is just an alias for getAllSignals with a channel filter
        if (typeof channel === 'string') {
            for (let i=0; i<this._channels.length; i++) {
                if (this._channels[i]?.label === channel) {
                    channel = i
                    break
                } else if (i === this._channels.length - 1) {
                    return []
                }
            }
        }
        return this.getAllSignals(signals, range, config, [channel as number])[0]
    }
    mapChannels (setup: EegSetup, config: any) {
        const channelMap: any = {}
        this._channels = []
        // If config is null, construct an 'as recorded' montage
        if (!config) {
            for (const chan of setup.signals) {
                this._channels.push({
                    label: chan.label,
                    name: chan.name,
                    active: chan.index || 0,
                    samplingRate: chan.samplingRate || 0,
                    reference: [],
                    amplification: chan.amplification || 1,
                    offset: 0,
                })
            }
            this.calculateSignalOffsets(config)
            return
        } else if (config === "default:10-20:db") {
            this._label = "default:db"
            config = defaults['10-20'].db
        } else if (config === "default:10-20:raw") {
            // TODO: Settings to disable loading some or all defaults
            this._label = "default:raw"
            config = defaults['10-20'].raw
        }
        // First map labels to correct channel indices
        label_loop:
        for (const sig of config.signals) {
            for (const sSig of setup.signals) {
                if (sig === sSig.label) {
                    channelMap[sig] = { idx: sSig.index, sr: sSig.samplingRate, amp: sSig.amplification }
                    continue label_loop
                }
            }
            channelMap[sig] = null // Not found
        }
        // Next, map active and reference electrodes to correct signal channels
        for (const chan of config.channels) {
            // Check that active channel or single reference channel can be found
            if (channelMap[chan.active] === null || channelMap[chan.active] === undefined) {
                this._channels.push({
                    label: chan.label,
                    name: chan.name,
                    active: null,
                    reference: [],
                    samplingRate: 0,
                    amplification: 0,
                    offset: 0,
                })
                continue
            }
            const refs = []
            if (chan.reference.length) {
                for (const ref of chan.reference) {
                    if (
                        channelMap[ref] !== null && channelMap[ref] !== undefined &&
                        channelMap[chan.active].sr === channelMap[ref].sr
                    ) {
                        refs.push(channelMap[ref].idx)
                    }
                }
                if (!refs.length) {
                    // Not a single reference channel found
                    this._channels.push({
                        label: chan.label,
                        name: chan.name,
                        active: null,
                        reference: [],
                        samplingRate: 0,
                        amplification: 0,
                        offset: 0,
                    })
                } else {
                    // Construct the channel
                    this._channels.push({
                        label: chan.label,
                        name: chan.name,
                        active: channelMap[chan.active].idx,
                        reference: refs,
                        samplingRate: channelMap[chan.active].sr,
                        amplification: channelMap[chan.active].amp || 1,
                        offset: 0,
                    })
                }
            } else {
                this._channels.push({
                    label: chan.label,
                    name: chan.name,
                    active: channelMap[chan.active].idx,
                    reference: [],
                    samplingRate: channelMap[chan.active].sr,
                    amplification: channelMap[chan.active].amp || 1,
                    offset: 0,
                })
            }
        }
        this._config = config // Save config for later offset calculation etc.
    }
    calculateSignalOffsets (config: any) {
        // Check if this is an 'as recorded' montage
        if (!config) {
            const layoutH = this._channels.length + 1
            for (let i=0; i<this._channels.length; i++) {
                (this._channels[i] as any).offset = 1.0 - ((i + 1)/layoutH)
            }
            return
        }
        // Calculate channel offsets from the provided config
        let nGroups = 0
        let nChannels = 0
        // Grab layout from default config if not provided
        const layout = config.layout === undefined ? [...this._config.layout] : [...config.layout]
        for (const group of layout) {
            nChannels += group // Add the amount of items in this group
            nGroups++ // Add one group
        }
        if (nChannels !== this._channels.length) {
            console.warn("The number of channels does not match config layout!")
        }
        let layoutH = 2*config.yPadding // Start with top and bottom padding
        layoutH += (nChannels - (nGroups - 1) - 1)*config.channelSpacing // Add channel heights
        layoutH += (nGroups - 1)*config.groupSpacing // Add group heights
        // Go through the signals and add their respective offsets
        let yPos = 1.0 - config.yPadding/layoutH// First trace is y-padding away from the top
        let chanIdx = 0
        ;(this._channels[chanIdx] as any).offset = yPos
        for (let i=0; i<layout.length; i++) {
            for (let j=0; j<layout[i]; j++) {
                if (!j && i) { // Item is first in its group but not the very first channel
                    yPos -= (1/layoutH)*config.groupSpacing
                } else if (chanIdx) { // Skip the very first channel
                    yPos -= (1/layoutH)*config.channelSpacing
                }
                (this._channels[chanIdx] as any).offset = yPos
                chanIdx++
            }
        }
    }
    resetChannels () {
        this._channels = []
    }
 }
 export default EdfEegMontage
