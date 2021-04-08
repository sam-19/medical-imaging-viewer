/** MEDIGI VIEWER DICOM IMAGE STACK
 * Class for managing DICOM image stacks.
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import * as cornerstone from 'cornerstone-core'
import cornerstoneTools from 'cornerstone-tools'
import DicomMedia from './DicomMedia'
import { ImageResource, ImageStackResource } from '../../types/assets'

const TOPOGRAM_PADDING = 0.2

class DicomImageStack extends DicomMedia implements ImageStackResource {
    private _coverImage?: string
    private _currentPosition: number = 0
    private _images: ImageResource[]
    private _linkedPosition: number = -1
    // We need to save the position where the stack is linked if we want
    // to allow scrolling relative to that starting point.
    private _masterLinkPosition: number = -1
    private _preloaded: number = 0
    private _topogram: null | ImageResource = null
    private _topogramBounds = { x: [-1, -1], y: [-1, -1] }
    private _topogramIntersections: any = {}

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
    get currentImage () {
        return this._images[this._currentPosition] || null
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
    get preloaded () {
        return this._preloaded
    }
    get size () {
        // Alias for length
        return this.length
    }
    get topogram () {
        return this._topogram
    }
    set topogram (img: ImageResource | null) {
        this._topogram = img
    }
    get topogramBounds () {
        return this._topogramBounds
    }
    set topogramBounds (bounds: { x: number[], y: number[] }) {
        this._topogramBounds = bounds
    }
    get topogramPaddedBounds () {
        if (this._topogram === null) {
            return undefined
        }
        // Apply a set amount padding to the bounds
        const topoXRange = this._topogramBounds.x[1] - this._topogramBounds.x[0]
        const topoYRange = this._topogramBounds.y[1] - this._topogramBounds.y[0]
        const topoPadX0 = this._topogramBounds.x[0] - topoXRange*TOPOGRAM_PADDING
        const topoPadX1 = this._topogramBounds.x[1] + topoXRange*TOPOGRAM_PADDING
        const topoPadY0 = this._topogramBounds.y[0] - topoYRange*TOPOGRAM_PADDING
        const topoPadY1 = this._topogramBounds.y[1] + topoYRange*TOPOGRAM_PADDING
        // Do not pad beyond actual image bound
        const actualX0 = topoPadX0 > 0 ? topoPadX0 : 0
        const actualY0 = topoPadY0 > 0 ? topoPadY0 : 0
        const actualX1 = topoPadX1 < this._topogram.dimensions[0]
                         ? topoPadX1 : this._topogram.dimensions[0]
        const actualY1 = topoPadY1 < this._topogram.dimensions[1]
                         ? topoPadY1 : this._topogram.dimensions[1]
        return { x: [actualX0, actualX1], y: [actualY0, actualY1] }
    }
    public add (image: ImageResource) {
        // Alias for push()
        this.push(image)
    }
    public async calculateTopogramIntersectPoints (): Promise<boolean> {
        if (this._topogram === null) {
            return false
        }
        // In addition to the topogram, the image stack has to be preloaded as well
        if (this._preloaded !== this._images.length) {
            return false
        }
        // We'll first check if the topogram is valid for this image stack
        const firstImagePlane = cornerstone.metaData.get(
            'imagePlaneModule',
            this._images[0].url
        ) as any
        const topoImagePlane = cornerstone.metaData.get(
            'imagePlaneModule',
            this._topogram.url
        ) as any
        // Check that image planes are valid
        if (!firstImagePlane || !firstImagePlane.rowCosines || !firstImagePlane.columnCosines || !firstImagePlane.imagePositionPatient
            || !topoImagePlane || !topoImagePlane.rowCosines || !topoImagePlane.columnCosines || !topoImagePlane.imagePositionPatient
        ) {
            console.warn(`Unable to calculate topogram intersections: Invalid image planes.`)
            return false
        }
        // Check that frame of reference UIDs match
        if (firstImagePlane.frameOfReferenceUID !== topoImagePlane.frameOfReferenceUID) {
            console.warn(`Unable to calculate topogram intersections: Different frames of reference.`)
            return false
        }
        // Convert cosines to vectors
        const convertToVector3 = cornerstoneTools.importInternal('util/convertToVector3')
        firstImagePlane.columnCosines = convertToVector3(firstImagePlane.columnCosines)
        topoImagePlane.columnCosines = convertToVector3(topoImagePlane.columnCosines)
        firstImagePlane.rowCosines = convertToVector3(firstImagePlane.rowCosines)
        topoImagePlane.rowCosines = convertToVector3(topoImagePlane.rowCosines)
        const stackNormal = firstImagePlane.rowCosines.clone().cross(firstImagePlane.columnCosines)
        const topoNormal = topoImagePlane.rowCosines.clone().cross(topoImagePlane.columnCosines)
        let angle = stackNormal.angleTo(topoNormal)
        // Check that angle is more than 60 degrees (~1 radians)
        if (Math.abs(angle) < 1) {
            // Remove unfit topogram image
            this._topogram = null
            console.warn(`Removing topogram image: Angle is too narrow (${angle.toFixed(1)} radians).`)
            return false
        }
        // Calculate start and end points for first image
        const planePlaneIntersection = cornerstoneTools.importInternal('util/planePlaneIntersection')
        let points = planePlaneIntersection(topoImagePlane, firstImagePlane)
        // Project the points to topogram image plane
        const projectPatientPointToImagePlane = cornerstoneTools.importInternal('util/projectPatientPointToImagePlane')
        let startPoint = projectPatientPointToImagePlane(points.start, topoImagePlane)
        let endPoint = projectPatientPointToImagePlane(points.end, topoImagePlane)
        this._topogramIntersections[this._images[0].url] = [ startPoint, endPoint ]
        // Save the first points for bounds calculation (smaller before larger)
        this._topogramBounds = {
            x: [ Math.min(startPoint.x, endPoint.x), Math.max(startPoint.x, endPoint.x) ],
            y: [ Math.min(startPoint.y, endPoint.y), Math.max(startPoint.y, endPoint.y) ]
        }
        // Loop through rest of the stack images
        for (let i=1; i<this._images.length; i++) {
            const imagePlane = cornerstone.metaData.get(
                'imagePlaneModule',
                this._images[i].url
            ) as any
            // Do the necessary checks
            if (!imagePlane || !imagePlane.rowCosines || !imagePlane.columnCosines || !imagePlane.imagePositionPatient) {
                continue
            }
            if (imagePlane.frameOfReferenceUID !== topoImagePlane.frameOfReferenceUID) {
                continue
            }
            points = planePlaneIntersection(topoImagePlane, imagePlane)
            startPoint = projectPatientPointToImagePlane(points.start, topoImagePlane)
            endPoint = projectPatientPointToImagePlane(points.end, topoImagePlane)
            this._topogramIntersections[this._images[i].url] = [ startPoint, endPoint ]
            // Update topogram bounds if needed
            if (this._topogramBounds.x[0] > startPoint.x) {
                this._topogramBounds.x[0] = startPoint.x
            }
            if (this._topogramBounds.x[0] > endPoint.x) {
                this._topogramBounds.x[0] = endPoint.x
            }
            if (this._topogramBounds.x[1] < startPoint.x) {
                this._topogramBounds.x[1] = startPoint.x
            }
            if (this._topogramBounds.x[1] < endPoint.x) {
                this._topogramBounds.x[1] = endPoint.x
            }
            if (this._topogramBounds.y[0] > startPoint.y) {
                this._topogramBounds.y[0] = startPoint.y
            }
            if (this._topogramBounds.y[0] > endPoint.y) {
                this._topogramBounds.y[0] = endPoint.y
            }
            if (this._topogramBounds.y[1] < startPoint.y) {
                this._topogramBounds.y[1] = startPoint.y
            }
            if (this._topogramBounds.y[1] < endPoint.y) {
                this._topogramBounds.y[1] = endPoint.y
            }
        }
        return true
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
    public getRefLineForImage (imageId?: string): any {
        if ((imageId && !this._topogramIntersections.hasOwnProperty(imageId)) ||
            (!imageId && !this.currentImage)
        ) {
            return undefined
        }
        const rawRefLine = imageId ? this._topogramIntersections[imageId]
                                   : this._topogramIntersections[this.currentImage.url]
        const paddedBounds = this.topogramPaddedBounds
        if (!rawRefLine || !paddedBounds) {
            return undefined
        }
        const deltaX = paddedBounds.x[0]
        const deltaY = paddedBounds.y[0]
        return {
            start: { x: rawRefLine[0].x - deltaX, y: rawRefLine[0].y - deltaY },
            end: { x: rawRefLine[1].x - deltaX, y: rawRefLine[1].y - deltaY }
        }
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
    public async preloadAndSortImages (): Promise<object> {
        if (!this._images.length) {
           return { success: false, reason: "Image stack doesn't contain any images" }
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
            }).catch((reason: any) => {
                console.log('error')
                return { success: false, reason: reason }
            })
            if (this._preloaded === this._images.length) {
                // All images have been loaded, sort them according to Instance Number
                this.sortImages('i')
                // Calculate topogram image bounds if topogram is set
                if (this._topogram !== null) {
                    await cornerstone.loadAndCacheImage(this._topogram.url).then((topo: any) => {
                        this._topogram?.readMetadataFromImage(topo)
                        this.calculateTopogramIntersectPoints()
                    })
                }
                return { success: true }
            }
        }
        return { success: true }
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

export default DicomImageStack
