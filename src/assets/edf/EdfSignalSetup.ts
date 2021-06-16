/** MEDICAL IMAGING VIEWER EDF SIGNAL MONTAGE
 * Class for handling DICOM waveforms (mostly biosignals).
 * @package    medimg-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import { EegSetup, EegSetupSignal } from '../../types/eeg'
const default1020 = require('./default_setups/10-20.json')

class EdfEegSetup implements EegSetup {
    protected _id: string
    protected _name: string
    protected _signals: EegSetupSignal[] = []
    protected _missing: EegSetupSignal[] = []
    protected _unmatched: EegSetupSignal[] = []

    constructor (id: string, channels?: any[], config?: any) {
        this._id = id
        this._name = id
        if (channels && config) {
            this.loadConfig(channels, config)
        } else if (channels && id==='default:10-20') {
            this.loadConfig(channels, default1020)
        }
    }
    // Getters and setters
    get signals () {
        return this._signals
    }
    set signals (channels: EegSetupSignal[]) {
        this._signals = channels
    }
    get missingSignals () {
        return this._missing
    }
    set missingSignals (channels: EegSetupSignal[]) {
        this._missing = channels
    }
    get name () {
        return this._name
    }
    set name (name: string) {
        this._name = name
    }
    get unmatchedSignals () {
        return this._unmatched
    }
    set unmatchedSignals (channels: EegSetupSignal[]) {
        this._unmatched = channels
    }
    // Methods
    /**
     * Load setup configuration from an external JSON object.
     * @param recordMeta metadata from the recording this setup should match
     * @param config configuration for the setup (as JSON)
     */
    loadConfig (recordChannels: any[], config: any) {
        this._name = config.name ? config.name : this._name
        if (config.signals) {
            config_loop:
            for (const sig of config.signals) {
                // First try matching exact names
                if (sig.label) {
                    for (let i=0; i<recordChannels.length; i++) {
                        if (sig.label.toLowerCase() === recordChannels[i].label.toLowerCase()) {
                            this._signals.push({
                                label: sig.label,
                                name: sig.name,
                                type: sig.type,
                                samplingRate: recordChannels[i].samplingRate,
                                index: i,
                                avgRef: sig.averageRef,
                                amplification: sig.amplification || 1,
                            })
                            continue config_loop
                        }
                    }
                }
                // No match, try pattern
                if (sig.pattern) {
                    for (let i=0; i<recordChannels.length; i++) {
                        if (recordChannels[i].label.match(new RegExp(sig.pattern, 'i')) !== null) {
                            this._signals.push({
                                label: sig.label,
                                name: sig.name,
                                type: sig.type,
                                samplingRate: recordChannels[i].samplingRate,
                                index: i,
                                avgRef: sig.averageRef,
                                amplification: sig.amplification || 1,
                            })
                            continue config_loop
                        }
                    }
                }
                // Channel is missing from recording
                this._missing.push({
                    label: sig.label,
                    name: sig.name,
                    type: sig.type,
                    avgRef: sig.averageRef,
                })
            }
            // Lastly, check if there are any extra channels not present in the config
            record_loop:
            for (let i=0; i<recordChannels.length; i++) {
                for (const chan of config.signals) {
                    if (chan.index === i) {
                        continue record_loop
                    }
                }
                // Channel is missing from config
                this._unmatched.push({
                    label: recordChannels[i].label,
                    name: recordChannels[i].label,
                })
            }
        }
    }
}
export default EdfEegSetup
