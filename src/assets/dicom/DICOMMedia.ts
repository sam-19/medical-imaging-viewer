/** MEDIGI VIEWER DICOM MEDIA
 * Parent class for all DICOM media.
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

interface DICOMMediaResource {
    url: string        // Download URL or Cornerstone image ID for the resource
    size: number       // Either byte size or item count
    name: string       // Display name for the media element
    type: string
}

class DICOMMedia implements DICOMMediaResource {
    protected _url: string
    protected _size: number
    protected _name: string
    protected _type: string

    constructor (url: string, size: number, name: string, type: string) {
        this._url = url
        this._size = size
        this._name = name
        this._type = type
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
export { DICOMMediaResource }
