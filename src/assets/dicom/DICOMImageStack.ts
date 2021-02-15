/** MEDIGI VIEWER DICOM IMAGE STACK
 * Class for managing DICOM image stacks.
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import cornerstone from 'cornerstone-core'
import DICOMMedia from './DICOMMedia'
import { ImageResource, ImageStackResource } from '../../types/assets'

class DICOMImageStack extends DICOMMedia implements ImageStackResource {
    private _coverImage?: string
    private _currentPosition: number = 0
    private _images: ImageResource[]
    private _linkedPosition: number = -1
    // We need to save the position where the stack is linked if we want
    // to allow scrolling relative to that starting point.
    private _masterLinkPosition: number = -1
    private _preloaded: number = 0

    constructor (size: number, name: string) {
        super('', size, 'image:stack', '')
        this._images = []
        this._name = name
    }

    // Getters and setters
    get coverImage () {
        return this._coverImage
    }
    set coverImage (image: string | undefined) {
        this._coverImage = image
    }
    get currentPosition () {
        return this._currentPosition
    }
    set currentPosition (pos: number) {
        if (pos >= 0 && pos < this._images.length) {
            this._currentPosition = pos
        }
    }
    get images () {
        return this._images
    }
    get isLinked () {
        return this._linkedPosition !== -1
    }
    get linkedPosition () {
        return this._linkedPosition
    }
    set linkedPosition (pos: number) {
        if (pos >= 0 && pos < this._images.length) {
            this._linkedPosition = pos
        }
    }
    get masterLinkPosition () {
        return this._masterLinkPosition
    }
    set masterLinkPosition (pos: number) {
        this._masterLinkPosition = pos
    }
    get length () {
        return this._images.length
    }
    get size () {
        // Alias for length
        return this.length
    }
    public add (image: ImageResource) {
        // Alias for push()
        this.push(image)
    }
    public getIndexById (id: string): number {
        for (let i=0; i<this._images.length; i++) {
            if (this._images[i].id === id) {
                return i
            }
        }
        return -1
    }
    public getIndexByUrl (url: string): number {
        for (let i=0; i<this._images.length; i++) {
            if (this._images[i].url === url) {
                return i
            }
        }
        return -1
    }
    /**
     * Link this image stack at the given master link and local positions.
     * @param masterLinkPos master link position
     * @param localPos local position (stack image index); default current position
     */
    public link (masterLinkPos: number, localPos?: number) {
        if (localPos === undefined) {
            localPos = this._currentPosition
        }
        this._linkedPosition = localPos
        this._masterLinkPosition = masterLinkPos
    }
    public push (image: ImageResource) {
        if (!this._images.length) {
            // Add the first image as cover image
            this._coverImage = image.url
        }
        this._images.push(image)
    }
    /**
     * Preload the image stack images into cache and sort them by instance number.
     * @param {Function} callback Will call true when ready, false if aborted
     */
    public async preloadAndSortImages (): Promise<boolean> {
        if (!this._images.length) {
           return false
        }
        this._preloaded = 0 // Reset counter
        for (let i=0; i<this._images.length; i++) {
            // Await is DEFINITELY needed here!
            await cornerstone.loadAndCacheImage(this._images[i].url).then((image: any) => {
                this._images[i].readMetadataFromImage(image)
                this._preloaded++
                if (!i) {
                    // Store dimensions from the first image
                    this._dimensions = [image.width, image.height]
                }
            })
            if (this._preloaded === this._images.length) {
                // All images have been loaded, sort them according to Instance Number
                this.sortImages('i')
                return true
            }
        }
        return true
    }
    public removeFromCache = () => {
        for (let i=0; i<this._images.length; i++) {
            try {
                this._images[i].removeFromCache()
            } finally {}
        }
    }
    public setCoverImage (index: number) {
        this._coverImage = this._images[index].url
    }
    public setCurrentPositionById (id: string) {
        const curPos = this.getIndexById(id)
        // Default to 0, or the last position cannot be found (if it ends up being -1)
        this._currentPosition = curPos >= 0 ? curPos : 0
    }
    public setCurrentPositionByUrl (url: string) {
        const curPos = this.getIndexByUrl(url)
        this._currentPosition = curPos >= 0 ? curPos : 0
    }
    /**
     * Sort images according to one of:
     * @param {string} key 'i' for index, 'n' for name
     */
    public sortImages (key: 'i' | 'n'): void {
        this._images.sort((a: ImageResource, b: ImageResource) => {
            if (key === 'i') {
                // Sort by index (instance number)
                return (a.instanceNumber || 0) - (b.instanceNumber || 0)
            } else if (key === 'n') {
                // Sort by file name
                return a.name.localeCompare(b.name)
            } else {
                // To humor TSLint
                return 0
            }
        })
    }
    /**
     * Unlink this image stack.
     */
    public unlink () {
        this._linkedPosition = -1
        this._masterLinkPosition = -1
    }
}

export default DICOMImageStack
