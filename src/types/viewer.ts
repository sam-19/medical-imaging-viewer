/** MEDIGI VIEWER CUSTOM TYPES
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

import { ImageResource, ImageStackResource, SignalResource } from './assets'

const MOUSE_BUTTON = {
    LEFT: 0,
    MIDDLE: 1,
    RIGHT: 2,
}

type MediaType = 'image' | 'biosignal'
type ImageModality = 'US' | 'XR' | 'CT' | 'MRI' | 'PET' | 'SPECT' | 'UNKNOWN'
type BiosignalModality = 'ECG' | 'EEG' | 'EOG' | 'UNKNOWN'
type AnyModality = BiosignalModality | ImageModality

interface PatientVisit {
    conclusion: string
    context: string
    date: number
    examination: string
    history: string
    studies: {
        eeg: SignalResource[]
        ekg: SignalResource[]
        radiology: (ImageResource|ImageStackResource)[]
    }
    title: string
}

interface ToolbarButton {
    id: string
    active: boolean
    enabled: boolean
    setFirst?: boolean  // Does this button start a new set?
    groups?: string[]  // Tool groups this button belongs to
    icon: string[] | string[][]
    overlay?: string
    tooltip: string
}

export {
    // Constants
    MOUSE_BUTTON,
    // Types
    AnyModality, MediaType, ImageModality, BiosignalModality,
    // Interfaces
    PatientVisit,
    ToolbarButton,
}
