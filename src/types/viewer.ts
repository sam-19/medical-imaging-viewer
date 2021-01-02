/** MEDIGI VIEWER CUSTOM TYPES
 * @package    medigi-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

type MediaType = 'image' | 'biosignal'
type ImageModality = 'US' | 'XR' | 'CT' | 'MRI' | 'PET' | 'SPECT'
type BiosignalModality = 'ECG' | 'EEG' | 'EOG'
type AnyModality = BiosignalModality | ImageModality

interface DICOMResource {
    url: string        // Download URL for the resource
    size: number       // Either byte size or item count
    name: string       // Display name for the resource list
}

 interface MediaItem {
    count: number
    title: string
    type: MediaType
    modality: AnyModality
}
 interface ToolbarButton {
    id: string
    active: boolean,
    enabled: boolean
    setFirst?: boolean  // Does this button start a new set?
    groups?: string[],  // Tool groups this button belongs to
    icon: string[] | string[][]
    tooltip: string
}

export { AnyModality, DICOMResource, ToolbarButton, MediaItem, MediaType, ImageModality, BiosignalModality }
