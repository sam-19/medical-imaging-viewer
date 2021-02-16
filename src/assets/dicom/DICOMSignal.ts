/** MEDIGI VIEWER DICOM SIGNAL
 * Class for handling DICOM signals (mostly biosignals).
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import { SignalResource } from '../../types/assets'
class DICOMSignal implements SignalResource {
    protected _active: boolean = false
    protected _channels: { label: string, resolution: number, signals: number[] }[]
    protected _duration: number
    protected _id: string
    protected _name: string
    protected _resolution: number = 0
    protected _type: string
    protected _url: string

    constructor (name: string, channels: { label: string, resolution: number, signals: number[] }[], duration: number, type: string, url: string) {
        // Generate a pseudo-random identifier for this object
        this._id = Math.random().toString(36).substr(2, 8)
        this._name = name
        this._channels = channels
        this._duration = duration
        // Find and store the highest resolution in this resource
        channels.forEach(chan => {
            if (chan.resolution > this._resolution) {
                this._resolution = chan.resolution
            }
        })
        this._type = type
        this._url = url
    }
    // Getters and setters
    get channels () {
        return this._channels
    }
    get duration () {
        return this._duration
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
    get name () {
        return this._name
    }
    set name (name: string) {
        this._name = name
    }
    get resolution () {
        return this._resolution
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

}
export default DICOMSignal
export { SignalResource }
