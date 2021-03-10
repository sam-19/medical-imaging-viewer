/** MEDIGI VIEWER ASSET TYPES
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

interface FileSystemItem {
    name: string
    path: string
    type: 'directory' | 'file'
    directories: FileSystemItem[]
    files: FileSystemItem[]
    file?: File
}
interface FileLoader {
    readFilesFromSource(source: DragEvent|string): Promise<FileSystemItem|undefined>
}
interface StudyLoader {
    loadFromFile(file: File, config?: object): Promise<StudyObject>
    loadFromFileSystem(fileTree: FileSystemItem, config?: object): Promise<any>
}
// StudyObject version 1.0
interface StudyObject {
    files: File[]
    format: string
    meta: object
    name: string
    scope: string
    type: string
    version: string
}
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

interface SignalResource {
    channels: { label: string, signals: number[] }[]
    name: string
    resolution: number // Highest resolution in this resource
    sampleCount: number
    type: string
    //url: string
}
interface SignalChannel {
    baseline: number
    filterLow: number
    filterHigh: number
    filterNotch: number
    label: string
    resolution: number
    sensitivity: number
    sensitivityCF: number
    signals: number[]
    timeSkew: number
}

export {
    FileSystemItem, FileLoader,
    MediaResource,
    ImageResource, ImageStackResource,
    SignalResource, SignalChannel,
    StudyLoader, StudyObject
}
