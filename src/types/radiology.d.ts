/** MEDIGI VIEWER RADIOLOGY TYPES
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

import { MediaResource } from './common'

//////////////////////////////////////////////////////////////////
//                     IMAGE INTERFACES                         //
//////////////////////////////////////////////////////////////////

interface ImageResource extends MediaResource {
    dimensions: number[]
    isStack: boolean
    topogram: ImageResource | null
    link(masterLinkPos: number, localPos?: number): void
    removeFromCache(): void
    setCoverImage(image: ImageResource | number | null): void
    unlink(): void
}
interface DicomImageResource extends ImageResource {
    columns: number | undefined
    coverImage: DicomImageResource | null
    currentImage: ImageResource | null
    currentPosition: number
    images: ImageResource[]
    instanceLength: number | undefined
    instanceNumber: number | undefined
    linkedPosition: number
    masterLinkPosition: number
    numberOfFrames: number | undefined
    rows: number | undefined
    sopClassUID: string | undefined
    sopInstanceUID: string | undefined
    add(image: ImageResource): void
    getIndexById(id: string): number
    getIndexByUrl(url: string): number
    push(image: ImageResource): void
    preloadAndCacheImage(): Promise<object>
    preloadAndSortImages(): Promise<object>
    readMetadataFromImage(image: DicomImageResource): void
    removeFromCache(): void
    setCurrentPositionById(id: string): void
    setCurrentPositionByUrl(url: string): void
    sortImages(key: 'i' | 'n'): void
}

export { DicomImageResource, ImageResource }
