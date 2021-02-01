/** MEDIGI VIEWER ASSET TYPES
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

interface FileSystemItem {
    name: string
    path: string
    type: 'directory' | 'file'
    directories?: FileSystemItem[]
    files?: FileSystemItem[]
    file?: File
}
interface FileLoader {
    readFilesFromSource(source: DragEvent | string): Promise<FileSystemItem|undefined>
}
interface MediaResource {
    dimensions: number[]
    id: string
    isActive: boolean
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
    instanceNumber?: number
    modality?: string
    numberOfFrames?: number
    rows?: number
    sopClassUID?: string
    sopInstanceUID?: string
    readMetadataFromImage(image: any): void
    setCoverImage(index?: number): void
}
interface ImageStackResource extends MediaResource {
    coverImage?: string
    currentPosition: number
    images: ImageResource[]
    linkedPosition: number
    masterLinkPosition: number
}

export { FileSystemItem, FileLoader, MediaResource, ImageResource, ImageStackResource }
