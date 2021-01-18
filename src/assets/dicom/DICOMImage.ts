/** MEDIGI VIEWER DICOM IMAGE
 * Class for managing DICOM images.
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import DICOMDataProperty from './DICOMDataProperty'
import DICOMModality from './DICOMModality'
import DICOMMedia from './DICOMMedia'
import { ImageResource } from '../../types/assets'


class DICOMImage extends DICOMMedia implements ImageResource {
    private _columns?: number
    private _coverImage?: string
    private _instanceNumber?: number
    private _numberOfFrames?: number
    private _rows?: number
    private _sopClassUID?: string
    private _sopInstanceUID?: string
    // Store tag values for metadata retrieval (remove the prefixed 0 for cornerstone)
    private TAGS = {
        /** Instance Number */
        iNum: DICOMDataProperty.getPropertyByTagPair(0x0020, 0x0013)?.getTagHex().substring(1),
        /** Number of Frames */
        fNum: DICOMDataProperty.getPropertyByTagPair(0x0028, 0x0008)?.getTagHex().substring(1),
        /** SOP Class UID */
        sopC: DICOMDataProperty.getPropertyByTagPair(0x0008, 0x0016)?.getTagHex().substring(1),
        /** SOP Instance UID */
        sopI: DICOMDataProperty.getPropertyByTagPair(0x0008, 0x0018)?.getTagHex().substring(1),
        /** Rows */
        rows: DICOMDataProperty.getPropertyByTagPair(0x0028, 0x0010)?.getTagHex().substring(1),
        /** Columns */
        cols: DICOMDataProperty.getPropertyByTagPair(0x0028, 0x0011)?.getTagHex().substring(1),
    }

    constructor (name: string, size: number, url: string) {
        super(name, size, 'image', url)
    }
    // Getters and setters
    // Columns
    get columns () {
        return this._columns
    }
    set columns (columns: number | undefined) {
        this._columns = columns
    }
    // Instance number
    get instanceNumber () {
        return this._instanceNumber
    }
    set instanceNumber (instanceNum: number | undefined) {
        this._instanceNumber = instanceNum
    }
    // Modality
    get modality () {
        return this._modality
    }
    set modality (modality: string | undefined) {
        if (modality !== undefined &&
            Object.keys(DICOMModality.LIST).indexOf(modality) !== -1
        ) {
            this._modality = modality
        }
    }
    get coverImage () {
        return this._coverImage
    }
    // Name (immutable after initiatian)
    get name () {
        return this._name
    }
    // Number of Frames
    get numberOfFrames () {
        return this._numberOfFrames
    }
    set numberOfFrames (frameNum: number | undefined) {
        this._numberOfFrames = frameNum
    }
    // Rows
    get rows () {
        return this._rows
    }
    set rows (rows: number | undefined) {
        this._rows = rows
    }
    // Size (immutable after initiatian)
    get size () {
        return this._size
    }
    // SOP Class UID
    get sopClassUID () {
        return this._sopClassUID
    }
    set sopClassUID (sopCUID: string | undefined) {
        this._sopClassUID = sopCUID
    }
    // SOP Instance UID
    get sopInstanceUID () {
        return this._sopInstanceUID
    }
    set sopInstanceUID (sopIUID: string | undefined) {
        this._sopInstanceUID = sopIUID
    }
    // Type (immutable after initiatian)
    get type () {
        return this._type
    }
    // URL (immutable after initiatian)
    get url () {
        return this._url
    }
    /**
     * Reads and stores metadata from the supplied image. The image is not saved,
     * use cornerstone cache to retrieve cached images.
     * @param {Image} image cornerstone Image object
     */
    public readMetadataFromImage = (image: any) => {
        // Store image metadata
        this._instanceNumber = parseInt(image.data.string(this.TAGS.iNum), 10)
        this._numberOfFrames = image.data.string(this.TAGS.fNum) || undefined
        this._sopClassUID = image.data.string(this.TAGS.sopC) || undefined
        this._sopInstanceUID = image.data.string(this.TAGS.sopI) || undefined
        this._rows = image.data.string(this.TAGS.rows) || undefined
        this._columns = image.data.string(this.TAGS.cols) || undefined
    }
    public setCoverImage = () => {
        this._coverImage = this._url
    }
}

export default DICOMImage
export { ImageResource }
