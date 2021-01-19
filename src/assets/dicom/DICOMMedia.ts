/** MEDIGI VIEWER DICOM MEDIA
 * Parent class for all DICOM media.
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import { MediaResource } from '../../types/assets'
class DICOMMedia implements MediaResource {
    protected _modality?: string
    protected _name: string
    protected _size: number
    protected _type: string
    protected _url: string

    constructor (name: string, size: number, type: string, url: string) {
        this._name = name
        this._size = size
        this._type = type
        this._url = url
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
        return this._type
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