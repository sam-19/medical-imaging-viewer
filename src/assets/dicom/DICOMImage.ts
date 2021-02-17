/** MEDIGI VIEWER DICOM IMAGE
 * Class for managing DICOM images.
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import cornerstone from 'cornerstone-core'
import DicomDataProperty from './DicomDataProperty'
import DicomModality from './DicomModality'
import DicomMedia from './DicomMedia'
import { ImageResource } from '../../types/assets'


class DicomImage extends DicomMedia implements ImageResource {
    private _columns?: number
    private _coverImage?: string
    private _instanceLength?: number
    private _instanceNumber?: number
    private _numberOfFrames?: number
    private _rows?: number
    private _sopClassUID?: string
    private _sopInstanceUID?: string
    private _studyID?: string
    private _studyNumber?: number
    // Store tag values for metadata retrieval (remove the prefixed 0 for cornerstone)
    private TAGS = {
        /** Study ID */
        stID: DicomDataProperty.getPropertyByTagPair(0x0020, 0x0010)?.getTagHex().substring(1),
        /** Study Number */
        sNum: DicomDataProperty.getPropertyByTagPair(0x0020, 0x0011)?.getTagHex().substring(1),
        /** Instance Length (number of items in the instance) */
        iLen: DicomDataProperty.getPropertyByTagPair(0x0020, 0x1208)?.getTagHex().substring(1),
        /** Instance Number */
        iNum: DicomDataProperty.getPropertyByTagPair(0x0020, 0x0013)?.getTagHex().substring(1),
        /** Number of Frames */
        fNum: DicomDataProperty.getPropertyByTagPair(0x0028, 0x0008)?.getTagHex().substring(1),
        /** SOP Class UID */
        sopC: DicomDataProperty.getPropertyByTagPair(0x0008, 0x0016)?.getTagHex().substring(1),
        /** SOP Instance UID */
        sopI: DicomDataProperty.getPropertyByTagPair(0x0008, 0x0018)?.getTagHex().substring(1),
        /** Rows */
        rows: DicomDataProperty.getPropertyByTagPair(0x0028, 0x0010)?.getTagHex().substring(1),
        /** Columns */
        cols: DicomDataProperty.getPropertyByTagPair(0x0028, 0x0011)?.getTagHex().substring(1),
    }

    constructor (name: string, size: number, url: string) {
        super(name, size, 'image', url)
        this._coverImage = url
    }
    // Getters and setters
    // Columns
    get columns () {
        return this._columns
    }
    set columns (columns: number | undefined) {
        this._columns = columns
    }
    // Instance length
    get instanceLength () {
        return this._instanceLength
    }
    set instanceLength (instanceLen: number | undefined) {
        this._instanceLength = instanceLen
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
            Object.keys(DicomModality.LIST).indexOf(modality) !== -1
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
    public async preloadAndCacheImage (): Promise<Object> {
        return await cornerstone.loadAndCacheImage(this._url).then((image: any) => image)
    }
    /**
     * Reads and stores metadata from the supplied image. If an image object is not
     * supplied, the image from this object's URL is loaded and cached.
     * @param {Image} image cornerstone Image object (optional)
     */
    public async readMetadataFromImage (image?: any): Promise<boolean> {
        if (!image) {
            // Load and cache the image if it wasn't given as a param
            image = await this.preloadAndCacheImage()
        }
        // Store image metadata
        this._dimensions = [image.width, image.height]
        this._studyID = image.data.string(this.TAGS.stID) || undefined
        this._studyNumber = parseInt(image.data.string(this.TAGS.sNum), 10) || undefined
        this._instanceLength = parseInt(image.data.string(this.TAGS.iLen), 10) || undefined
        this._instanceNumber = parseInt(image.data.string(this.TAGS.iNum), 10) || undefined
        this._numberOfFrames = image.data.string(this.TAGS.fNum) || undefined
        this._sopClassUID = image.data.string(this.TAGS.sopC) || undefined
        this._sopInstanceUID = image.data.string(this.TAGS.sopI) || undefined
        this._rows = image.data.string(this.TAGS.rows) || undefined
        this._columns = image.data.string(this.TAGS.cols) || undefined
        return true
    }
    public removeFromCache = () => {
        try {
            cornerstone.imageCache.removeImageLoadObject(this._url)
        } catch (e) {
        } finally {}
    }
    public setCoverImage = () => {
        this._coverImage = this._url
    }
}

export default DicomImage
export { ImageResource }
