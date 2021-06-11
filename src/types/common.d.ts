/** MEDICAL IMAGING VIEWER COMMON TYPES
 * @package    medimg-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

//////////////////////////////////////////////////////////////////
//                     GENERAL INTERFACES                       //
//////////////////////////////////////////////////////////////////

interface FileSystemItem {
    name: string
    path: string
    type: 'directory' | 'file'
    directories: FileSystemItem[]
    files: FileSystemItem[]
    file?: File
    url?: string
}
interface FileLoader {
    readFilesFromSource(source: DragEvent|string): Promise<FileSystemItem|undefined>
}
interface StudyLoader {
    loadFromFile(file: File, config?: object): Promise<StudyObject>
    loadFromFsItem(fileTree: FileSystemItem, config?: object): Promise<any>
}
interface PatientVisit {
    conclusion: string
    context: string
    counter: number
    date: number
    examination: string
    history: string
    studies: {
        eeg: BiosignalResource[]
        ekg: BiosignalResource[]
        radiology: MediaResource[]
    }
    title: string
}
interface VisitLoader {
    loadFromFsItem(fileTree: FileSystemItem, config?: object): Promise<any>
}
/**
 * A generic study type returned by the study loader (version 1.0).
 * @param data any data that should be immediately available, such as the parsed DICOM dataset
 * @param files an array files contained in the study, such as image files in an image series
 * @param format file format, such as dicom, edf etc.
 * @param meta metadata detailing the resource, including file mimetype
 * @param name study name
 * @param scope study type scope (radiology, ekg, eeg, emg etc.)
 * @param type resource type within the scope, such as image
 * @param urls an array of URLs for files that have not yet been loaded
 * @param version study object type version
 */
interface StudyObject {
    data: any
    files: File[]
    format: string
    meta: any
    name: string
    scope: string
    type: string
    urls: string[]
    version: string
}

//////////////////////////////////////////////////////////////////
//                     MEDIA INTERFACES                         //
//////////////////////////////////////////////////////////////////
/**
 * MediaResource is a parent interface holding the properties that are common
 * to all different types of media.
 * TODO: Some of these need to be moved to ImageResource, I think
 */
interface MediaResource {
    id: string
    isActive: boolean
    isCollation: boolean
    isLinked: boolean
    modality: string
    name: string       // Display name for the media element
    size: number       // Either byte size or item count
    type: string
    url: string        // Download URL or Cornerstone image ID for the resource
}

//////////////////////////////////////////////////////////////////
//                     SIGNAL INTERFACES                        //
//////////////////////////////////////////////////////////////////

interface BiosignalResource {
    // Properties
    annotations: BiosignalAnnotation[]
    channels: BiosignalChannel[]
    duration: number
    name: string
    maxSamplingRate: number // Highest resolution in this resource
    sampleCount: number
    type: string
    url: string
}
interface BiosignalAnnotation {
    channel: number
    index: number
    indexType: string
}
interface BiosignalChannel {
    label: string
    type?: BiosignalType
    samplingRate: number
    sensitivity?: number
    signal: number[]
    highpassFilter?: number
    lowpassFilter?: number
    notchFilter?: number
}
type BiosignalType = 'eeg' | 'eog' | 'ekg'

export {
    BiosignalResource, BiosignalAnnotation, BiosignalChannel, BiosignalType,
    FileSystemItem, FileLoader,
    MediaResource,
    StudyLoader, StudyObject,
    VisitLoader, PatientVisit,
}
