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
    private _coverImage?: ImageResource
    private _images: ImageResource[]
    private _preloaded: number

    constructor (size: number, name: string) {
        super('', size, name, 'image-stack')
        this._images = []
        this._preloaded = 0
    }

    // Getters and setters
    // Cover image
    get coverImage () {
        return this._coverImage
    }
    set coverImage (image: ImageResource | undefined) {
        this._coverImage = image
    }
    get images () {
        return this._images
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
    public push (image: ImageResource) {
        if (!this._images.length) {
            // Add the first image as cover image
            this._coverImage = image
        }
        this._images.push(image)
    }
    /**
    * Preload the image stack images into cache and sort them by instance number.
    * @param {Function} callback Will call true when ready, false if aborted
    */
    public async preloadAndSortImages (callback: Function): Promise<boolean> {
        if (!this._images.length) {
           return callback(false)
        }
        this._preloaded = 0 // Reset counter
        for (let i=0; i<this._images.length; i++) {
            await cornerstone.loadAndCacheImage(this._images[i].url).promise.then((image: any) => {
                this._preloaded++
                if (this._preloaded === this._images.length) {
                    // All images have been loaded, sort them according to Instance Number
                    this._images.sort((a: any, b: any) => {
                        const aPos = a.instanceNumber || 0
                        const bPos = b.instanceNumber || 0
                        return aPos - bPos
                    })
                    return callback(true)
                }
            })
        }
        return callback(false)
    }
}
