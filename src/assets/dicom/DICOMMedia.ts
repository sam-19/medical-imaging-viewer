/** MEDIGI VIEWER DICOM MEDIA
 * Parent class for all DICOM media.
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import { MediaResource } from '../../types/assets'
class DICOMMedia implements MediaResource {
    protected _active: boolean = false
    protected _dimensions: number[] = [0, 0]
    protected _id: string
    protected _linked: boolean = false
    protected _modality?: string
    protected _name: string
    protected _size: number
    protected _type: string
    protected _url: string

    constructor (name: string, size: number, type: string, url: string) {
        // Generate a pseudo-random identifier for this object
        this._id = Math.random().toString(36).substr(2, 8)
        this._name = name
        this._size = size
        this._type = type
        this._url = url
    }

    get dimensions () {
        return this._dimensions
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
    get isCollation () {
        return this._type.endsWith(':collation')
    }
    get isLinked () {
        return this._linked
    }
    set isLinked (val: boolean) {
        this._linked = val
    }
    get isStack () {
        return this._type.endsWith(':stack')
    }
    get name () {
        return this._name
    }
    set name (name: string) {
        this._name = name
    }
    get size () {
        return this._size
    }
    set size (size: number) {
        this._size = size
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
export default DICOMMedia
export { MediaResource }
