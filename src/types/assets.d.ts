/** MEDIGI VIEWER ASSET TYPES
 * @package    medigi-viewer
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
    loadFromFileSystem(fileTree: FileSystemItem, config?: object): Promise<any>
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
    dimensions: number[]
    id: string
    isActive: boolean
    isCollation: boolean
    isLinked: boolean
    isStack: boolean
    modality?: string
    name: string       // Display name for the media element
    size: number       // Either byte size or item count
    type: string
    url: string        // Download URL or Cornerstone image ID for the resource
}

//////////////////////////////////////////////////////////////////
//                     IMAGE INTERFACES                         //
//////////////////////////////////////////////////////////////////
// TODO: Combine ImageResource and ImageStackResource to just one interface

interface ImageResource extends MediaResource {
    columns?: number
    instanceLength?: number
    instanceNumber?: number
    modality?: string
    numberOfFrames?: number
    rows?: number
    sopClassUID?: string
    sopInstanceUID?: string
    readMetadataFromImage(image: any): void
    removeFromCache(): void
    setCoverImage(index?: number): void
}
interface ImageStackResource extends MediaResource {
    coverImage?: string
    currentImage: ImageResource | null
    currentPosition: number
    images: ImageResource[]
    linkedPosition: number
    masterLinkPosition: number
    topogram: ImageResource | null
    add(image: ImageResource): void
    getIndexById(id: string): number
    getIndexByUrl(url: string): number
    link(masterLinkPos: number, localPos?: number): void
    push(image: ImageResource): void
    preloadAndSortImages?(): Promise<object>
    removeFromCache(): void
    setCurrentPositionById(id: string): void
    setCurrentPositionByUrl(url: string): void
    sortImages(key: 'i' | 'n'): void
    unlink(): void
}

//////////////////////////////////////////////////////////////////
//                     SIGNAL INTERFACES                        //
//////////////////////////////////////////////////////////////////

interface SignalResource {
    // Properties
    annotations: any[]
    channels: SignalChannel[]
    name: string
    resolution: number // Highest resolution in this resource
    sampleCount: number
    type: string
    url: string
}
interface SignalChannel {
    label: string
    resolution: number
    sensitivity: number
    signal: number[]
    // DICOM signal properties
    baseline?: number
    filterLow?: number
    filterHigh?: number
    filterNotch?: number
    sensitivityCF?: number
    timeSkew?: number
    // EDF signal properties

}
/**
 * Configuration for a single signal channel in SignalSetup.
 * @param label identifying label used to match signals in SignalMontage
 * @param name descriptive name for the channel
 * @param type signal type
 * @param index matched signal index in recording data, optional
 * @param avgRef is the raw signal already referenced to signal average (so we don't average twice), optional
 */
interface SignalSetupChannel {
    label: string
    name: string
    type?: 'eeg' | 'eog' | 'ekg'
    samplingRate?: number
    index?: number
    avgRef?: boolean
}
/**
 * Setup for interpreting a particular signal resource.
 * @param name descriptive name for the setup
 * @param channels configuration for each matched channel in the setup
 * @param expectedChannels channels expected to be present in the setup
 * @param missingChannels channels that should have been present, but were not found
 * @param unmatchedChannels channels that could not be matched to any expected channel
 */
interface SignalSetup {
    name: string
    channels: SignalSetupChannel[]
    missingChannels: SignalSetupChannel[]
    unmatchedChannels: SignalSetupChannel[]
}
/**
 * A single channel in montage configuration.
 * @param label identifying label for the channel
 * @param name descriptive name for the channel
 * @param active active channel index
 * @param reference reference channel indices; multiple reference channels will be averaged
 */
interface SignalMontageChannel {
    label: string
    name: string
    active: number
    reference: number[]
    offset: number
}
/**
 * Signal montage describes how a particular signal should be presented.
 * @param label identifying label for the montage
 * @param name descriptive name for the montage
 * @param channels configuration for channels in this montage
 * @param getAllSignals return calculated signals from the given signals in the given range ([starting index, ending index], optional)
 * @param getChannelSignal return calculated signal from the given for a given channel in the given range  ([starting index, ending index], optional)
 * @param mapChannels map montage channel indices according to given signal setup and montage config
 * @param resetChannels reset mapped channels
 */
interface SignalMontage {
    label: string
    name: string
    channels: (SignalMontageChannel | null)[]
    getAllSignals(signals: number[][], range?: number[]): number[][]
    getChannelSignal(signals: number[][], index: number, range?: number[]): number[]
    mapChannels(setup: SignalSetup, config: any): void
    resetChannels(): void
}

export {
    FileSystemItem, FileLoader,
    MediaResource,
    ImageResource, ImageStackResource,
    SignalResource, SignalChannel, SignalSetup, SignalSetupChannel, SignalMontage, SignalMontageChannel,
    StudyLoader, StudyObject
}
