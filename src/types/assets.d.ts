/** MEDIGI VIEWER ASSET TYPES
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

interface MediaResource {
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
}
interface ImageStackResource extends MediaResource {
    coverImage?: ImageResource
    images: ImageResource[]
}

export { MediaResource, ImageResource, ImageStackResource }
