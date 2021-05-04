/** MEDIGI VIEWER EDF SIGNAL MONTAGE
 * Class for handling DICOM waveforms (mostly biosignals).
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import { SignalSetup, SignalSetupChannel } from '../../types/assets'

class EdfSignalSetup implements SignalSetup {
    protected _name: string = ''
    protected _channels: SignalSetupChannel[] = []
    protected _missing: SignalSetupChannel[] = []
    protected _unmatched: SignalSetupChannel[] = []

    constructor (channels?: any[], config?: any) {
        if (channels && config) {
            this.loadConfig(channels, config)
        }
    }
    // Getters and setters
    get channels () {
        return this._channels
    }
    set channels (channels: SignalSetupChannel[]) {
        this._channels = channels
    }
    get missingChannels () {
        return this._missing
    }
    set missingChannels (channels: SignalSetupChannel[]) {
        this._missing = channels
    }
    get name () {
        return this._name
    }
    set name (name: string) {
        this._name = name
    }
    get unmatchedChannels () {
        return this._unmatched
    }
    set unmatchedChannels (channels: SignalSetupChannel[]) {
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
        if (config.channels) {
            config_loop:
            for (const chan of config.channels) {
                // First try matching exact names
                if (chan.label) {
                    for (let i=0; i<recordChannels.length; i++) {
                        if (chan.label.toLowerCase() === recordChannels[i].label.toLowerCase()) {
                            this._channels.push({
                                label: chan.label,
                                name: chan.name,
                                type: chan.type,
                                samplingRate: recordChannels[i].resolution,
                                index: i,
                                avgRef: chan.averageRef,
                            })
                            continue config_loop
                        }
                    }
                }
                // No match, try pattern
                if (chan.pattern) {
                    for (let i=0; i<recordChannels.length; i++) {
                        if (recordChannels[i].label.match(new RegExp(chan.pattern)) !== null) {
                            this._channels.push({
                                label: chan.label,
                                name: chan.name,
                                type: chan.type,
                                samplingRate: recordChannels[i].resolution,
                                index: i,
                                avgRef: chan.averageRef,
                            })
                            continue config_loop
                        }
                    }
                }
                // Channel is missing from recording
                this._missing.push({
                    label: chan.label,
                    name: chan.name,
                    type: chan.type,
                    avgRef: chan.averageRef,
                })
            }
            // Lastly, check if there are any extra channels not present in the config
            record_loop:
            for (let i=0; i<recordChannels.length; i++) {
                for (const chan of config.channels) {
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
export default EdfSignalSetup