/** MEDIGI VIEWER EDF SIGNAL MONTAGE
 * Class for handling DICOM waveforms (mostly biosignals).
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import { SignalMontage, SignalMontageChannel, SignalSetup } from '../../types/assets'

 class EdfSignalMontage implements SignalMontage {
    protected _label: string
    protected _name: string = 'Unknown'
    protected _channels: (SignalMontageChannel | null)[] = []

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
    set channels (channels: (SignalMontageChannel | null)[]) {
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
    getAllSignals (signals: number[][], range?: number[], onlyChannels: number[] = []) {
        const derivedSignals = []
        const avgMap = [] as number[] // Only calculate averages once
        // Filter channels, if needed
        const channels = onlyChannels.length ? [] as SignalMontageChannel[] : this._channels
        for (const c of onlyChannels) {
            channels.push(this._channels[c])
        }
        for (const chan of channels) {
            if (chan === null) {
                derivedSignals.push([])
                continue
            }
            if (!chan.reference.length) {
                derivedSignals.push(
                    range === undefined ? signals[chan.active]
                    : signals[chan.active].slice(range[0], range[1])
                )
                continue
            }
            // Check that given range is valid
            if (range === undefined || range.length !== 2) {
                range = [0, signals[chan.active].length]
            } else {
                if (range[0] < 0 || range[0] > signals[chan.active].length) {
                    range[0] = 0
                }
                if (range[1] < 0 || range[1] > signals[chan.active].length || range[1] < range[0]) {
                    range[1] = signals[chan.active].length
                }
            }
            // Need to calculate signal relative to reference(s), one datapoint at a time.
            // Check that active signal and all reference signals have the same length.
            const refs = [] as any
            for (const ref of chan.reference) {
                if (signals[chan.active].length === signals[ref].length) {
                    refs.push[ref]
                }
            }
            const derivSig = []
            let refAvg = 0
            for (let i=range[0]; i<range[1]; i++) {
                if (avgMap[i] !== undefined) {
                    refAvg = avgMap[i]
                } else {
                    if (refs.length > 1) {
                        for (const ref of refs) {
                            refAvg += signals[ref][i]
                        }
                        refAvg /= refs.length
                        avgMap[i] = refAvg
                    } else {
                        refAvg = signals[refs[0]][i]
                    }
                }
                derivSig.push(signals[chan.active][i] - refAvg)
            }
            derivedSignals.push(derivSig)
        }
        return derivedSignals
    }
    getChannelSignal (signals: number[][], channel: number | string, range?: number[]) {
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
        return this.getAllSignals(signals, range, [channel as number])[0]
    }
    mapChannels (setup: SignalSetup, config: any) {
        const channelMap: any = {}
        this._channels = []
        // First map labels to correct channel indices
        label_loop:
        for (const cLabel of config.channelLabels) {
            for (const sChan of setup.channels) {
                if (cLabel === sChan.label) {
                    channelMap[cLabel] = { idx: sChan.index, sr: sChan.samplingRate }
                    continue label_loop
                }
            }
            channelMap[cLabel] = null // Not found
        }
        // Next, map active and reference electrodes to correct signal channels
        for (const chan of config.channels) {
            // Check that active channel or single reference channel can be found
            if (channelMap[chan.active] === null || channelMap[chan.active] === undefined) {
                this._channels.push(null)
                continue
            }
            const refs = []
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
                this._channels.push(null)
            } else {
                // Construct the channel
                this._channels.push({
                    label: chan.label,
                    name: chan.name,
                    active: channelMap[chan.active].idx,
                    reference: refs
                })
            }
        }
    }
    resetChannels () {
        this._channels = []
    }
 }
 export default EdfSignalMontage
