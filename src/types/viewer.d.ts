/** MEDICAL IMAGING STUDY VIEWER CUSTOM TYPES
 * @package    medimg-viewer
 * @copyright  2020-2022 Sampsa Lohi & University of Eastern Finland
 * @license    MIT
 */

import { BiosignalResource } from './common'
import { ImageResource } from './radiology'

declare enum MOUSE_BUTTON {
    LEFT = 0,
    MIDDLE = 1,
    RIGHT = 2,
}

type MediaType = 'image' | 'biosignal'
type ImageModality = 'US' | 'XR' | 'CT' | 'MRI' | 'PET' | 'SPECT' | 'UNKNOWN'
type BiosignalModality = 'ECG' | 'EEG' | 'EOG' | 'UNKNOWN'
type AnyModality = BiosignalModality | ImageModality

interface ToolbarSelectOption {
    group: string,
    label: string,
    value: any,
}
interface ToolbarControlElement {
    id: string
    active: boolean
    enabled: boolean
    set: number
    setFirst?: boolean // Does this element start a new set?
    groups?: string[] // Tool groups this element belongs to
    icon: string[] | string[][]
    label: string,
    options: ToolbarSelectOption[],
    selected?: number
    overlay?: string
    tooltip: string
    type?: string
}

export {
    // Constants
    MOUSE_BUTTON,
    // Types
    AnyModality, MediaType, ImageModality, BiosignalModality,
    ToolbarControlElement, ToolbarSelectOption,
}
