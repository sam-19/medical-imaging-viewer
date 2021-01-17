/** MEDIGI VIEWER DICOM IMAGE
 * Class for managing DICOM images.
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import DICOMDataProperty from './DICOMDataProperty'
import DICOMModality from './DICOMModality'

interface DICOMImageResource {
    url: string        // Download URL or Cornerstone image ID for the resource
    size: number       // Either byte size or item count
    name: string       // Display name for the resource list
    type: 'image'
    modality: string
    instanceNumber?: number
    sopClassUID?: string
    sopInstanceUID?: string
    numberOfFrames?: number
    rows?: number
    columns?: number
}

class DICOMImage {
    readonly url: string
    readonly size: number
    readonly name: string
    readonly type: string
    private columns?: number
    private instanceNumber?: number
    private modality?: string
    private numberOfFrames?: number
    private rows?: number
    private sopClassUID?: string
    private sopInstanceUID?: string

    constructor (url: string, size: number, name: string) {
        this.url = url
        this.size = size
        this.name = name
        this.type = 'image'
    }
    // Getters
    public getColumns = () => {
        return this.columns
    }
    public getInstanceNumber = () => {
        return this.instanceNumber
    }
    public getModality = () => {
        return this.modality
    }
    public getNumberOfFrames = () => {
        return this.numberOfFrames
    }
    public getRows = () => {
        return this.rows
    }
    public getSOPClassUID = () => {
        return this.sopClassUID
    }
    public getSOPInstanceUID = () => {
        return this.sopInstanceUID
    }
    public readMetadataFromImage = (image: any) => {
        // Get tag values for metadata retrieval and remove the prefixed 0 for cornerstone
        // Instance Number
        const iNum = DICOMDataProperty.getPropertyByTagPair(0x0020, 0x0013)?.getTagHex().substring(1)
        // Number of Frames
        const fNum = DICOMDataProperty.getPropertyByTagPair(0x0028, 0x0008)?.getTagHex().substring(1)
        // SOP Class UID
        const sopC = DICOMDataProperty.getPropertyByTagPair(0x0008, 0x0016)?.getTagHex().substring(1)
        // SOP Instance UID
        const sopI = DICOMDataProperty.getPropertyByTagPair(0x0008, 0x0018)?.getTagHex().substring(1)
        // Rows
        const rows = DICOMDataProperty.getPropertyByTagPair(0x0028, 0x0010)?.getTagHex().substring(1)
        // Columns
        const cols = DICOMDataProperty.getPropertyByTagPair(0x0028, 0x0011)?.getTagHex().substring(1)
        // Store image metadata
        this.instanceNumber = parseInt(image.data.string(iNum), 10)
        this.numberOfFrames = image.data.string(fNum) || undefined
        this.sopClassUID = image.data.string(sopC) || undefined
        this.sopInstanceUID = image.data.string(sopI) || undefined
        this.rows = image.data.string(rows) || undefined
        this.columns = image.data.string(cols) || undefined
    }
    // Setters
    public setColumns = (columns: number) => {
        this.columns = columns
    }
    public setInstanceNumber = (instanceNum: number) => {
        this.instanceNumber = instanceNum
    }
    public setModality = (modality: string) => {
        if (Object.keys(DICOMModality.LIST).indexOf(modality) !== -1) {
            this.modality = modality
        }
    }
    public setNumberOfFrames = (frameNum: number) => {
        this.numberOfFrames = frameNum
    }
    public setRows = (rows: number) => {
        this.rows = rows
    }
    public setSOPClassUID = (sopCUID: string) => {
        this.sopClassUID = sopCUID
    }
    public setSOPInstanceUID = (sopIUID: string) => {
        this.sopInstanceUID = sopIUID
    }

}

export default DICOMImage
export { DICOMImageResource }
