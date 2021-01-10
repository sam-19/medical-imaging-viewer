/** MEDIGI VIEWER CUSTOM TYPES
 * @package    medigi-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

const MOUSE_BUTTON = {
    LEFT: 0,
    MIDDLE: 1,
    RIGHT: 2,
}

type MediaType = 'image' | 'biosignal'
type ImageModality = 'US' | 'XR' | 'CT' | 'MRI' | 'PET' | 'SPECT' | 'UNKNOWN'
type BiosignalModality = 'ECG' | 'EEG' | 'EOG' | 'UNKNOWN'
type AnyModality = BiosignalModality | ImageModality

/**
 * An image stack passed to DICOMImage component
 */
interface DICOMImageStack {
    label: string
    images: DICOMResource[]
    modality: ImageModality
}
/**
 * A general DICOM resource interface
 */
interface DICOMResource {
    url: string        // Download URL or Cornerstone image ID for the resource
    size: number       // Either byte size or item count
    name: string       // Display name for the resource list
    type: MediaType
    modality: AnyModality
}
/**
 * Metadata interface used by SidebarItem
 */
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

export {
    // Constants
    MOUSE_BUTTON,
    // Types
    AnyModality, MediaType, ImageModality, BiosignalModality,
    // Interfaces
    DICOMImageStack, DICOMResource, ToolbarButton, MediaItem,
}
