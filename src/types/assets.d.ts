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
    modality?: string
    name: string       // Display name for the media element
    size: number       // Either byte size or item count
    type: string
    url: string        // Download URL or Cornerstone image ID for the resource
}

interface ImageResource extends MediaResource {
    modality?: string
    instanceNumber?: number
    sopClassUID?: string
    sopInstanceUID?: string
    numberOfFrames?: number
    rows?: number
    columns?: number
    readMetadataFromImage(image: any): void
    setCoverImage(index?: number): void
}
interface ImageStackResource extends MediaResource {
    coverImage?: string
    images: ImageResource[]
}

export { FileSystemItem, FileLoader, MediaResource, ImageResource, ImageStackResource }
