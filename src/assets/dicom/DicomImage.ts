/** MEDIGI VIEWER DICOM IMAGE STACK
 * Class for managing DICOM image stacks.
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import * as cornerstone from 'cornerstone-core'
import cornerstoneTools from 'cornerstone-tools'
import { DicomImageResource } from '../../types/radiology'

const TOPOGRAM_PADDING = 0.2
const convertToVector3 = cornerstoneTools.importInternal('util/convertToVector3')

class DicomImage implements DicomImageResource {
    private _active: boolean = false
    private _columns: number | undefined
    private _coverImage: DicomImageResource | null = null
    private _currentPosition: number = 0
    private _dimensions: number[] = [0, 0]
    private _id: string
    private _images: DicomImageResource[]
    private _instanceLength: number | undefined
    private _instanceNumber: number | undefined
    private _linkedPosition: number = -1
    // We need to save the position where the stack is linked if we want
    // to allow scrolling relative to that starting point.
    private _masterLinkPosition: number = -1
    private _modality: string
    private _name: string
    private _numberOfFrames: number | undefined
    private _preloadProcess: Promise<any> | null = null
    private _preloaded: number = 0
    private _rows: number | undefined
    private _size: number
    private _sopClassUID: string | undefined
    private _sopInstanceUID: string | undefined
    private _studyID: string | undefined
    private _studyNumber: number | undefined
    private _topogram: null | DicomImageResource = null
    private _topogramBounds = { x: [-1, -1], y: [-1, -1] }
    private _topogramIntersections: any = {}
    private _type: string
    private _url: string
    // Optional parameters depending on modality
    private _imageOrientation: number[] | undefined
    private _sliceThickness: number | undefined
    private _sliceLocation: number | undefined
    private _KVP: number | undefined
    private _exposureTime: number | undefined
    private _tubeCurrent: number | undefined
    private _exposure: number | undefined

    constructor (modality: string, name: string, size: number, type: string, url: string) {
        // Generate a pseudo-random identifier for this object
        this._id = Math.random().toString(36).substr(2, 8)
        this._images = []
        this._modality = modality
        this._name = name
        this._size = size
        this._type = type
        this._url = url
    }

    // Getters and setters
    get columns () {
        return this._columns
    }
    set columns (columns: number | undefined) {
        this._columns = columns
    }
    get coverImage () {
        if (this._coverImage) {
            return this._coverImage
        } else if (!this.isStack && this._url) {
            return this
        } else {
            return null
        }
    }
    set coverImage (image: DicomImageResource | null) {
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
    get dimensions () {
        return this._dimensions
    }
    get exposure () {
        return this._exposure
    }
    get exposureTime () {
        return this._exposureTime
    }
    get id () {
        return this._id
    }
    get imageOrientation () {
        return this._imageOrientation
    }
    get images () {
        return this._images
    }
    get instanceLength () {
        return this._instanceLength
    }
    set instanceLength (len: number | undefined) {
        this._instanceLength = len
    }
    get instanceNumber () {
        return this._instanceNumber
    }
    set instanceNumber (num: number | undefined) {
        this._instanceNumber = num
    }
    get isActive () {
        return this._active
    }
    set isActive (val: boolean) {
        this._active = val
    }
    get isCollation () {
        return this._type.endsWith(':collation')
    }
    get isLinked () {
        return this._linkedPosition !== -1
    }
    get isStack () {
        return this._type.endsWith(':series')
    }
    get KVP () {
        return this._KVP
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
    get modality () {
        return this._modality
    }
    set modality (modality: string) {
        this._modality = modality
    }
    get name () {
        return this._name
    }
    set name (name: string) {
        this._name = name
    }
    get numberOfFrames () {
        return this._numberOfFrames
    }
    set numberOfFrames (num: number | undefined) {
        this._numberOfFrames = num
    }
    get length () {
        return this._images.length
    }
    get preloaded () {
        return this._preloaded
    }
    get rows () {
        return this._rows
    }
    set rows (rows: number | undefined) {
        this._rows = rows
    }
    get size () {
        // Alias for length
        return this.length
    }
    get sliceLocation () {
        return this._sliceLocation
    }
    get sliceThickness () {
        return this._sliceThickness
    }
    get sopClassUID () {
        return this._sopClassUID
    }
    set sopClassUID (uid: string | undefined) {
        this._sopClassUID = uid
    }
    get sopInstanceUID () {
        return this._sopInstanceUID
    }
    set sopInstanceUID (uid: string | undefined) {
        this._sopInstanceUID = uid
    }
    get studyID () {
        return this._studyID
    }
    set studyID (id: string | undefined) {
        this._studyID = id
    }
    get studyNumber () {
        return this._studyNumber
    }
    set studyNumber (num: number | undefined) {
        this._studyNumber = num
    }
    get topogram () {
        return this._topogram
    }
    set topogram (img: DicomImageResource | null) {
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
    get tubeCurrent () {
        return this._tubeCurrent
    }
    get type () {
        return this._type.split(':')[0]
    }
    set type (type: string) {
        this._type = type
    }
    get url () {
        return this._url
    }
    set url (url: string) {
        this._url = url
    }
    ///////////////////////////////////////////
    //               METHODS                 //
    ///////////////////////////////////////////
    public add (image: DicomImageResource) {
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
    public push (image: DicomImageResource) {
        this._images.push(image)
    }
    public async preloadAndCacheImage (): Promise<Object> {
        if (!this.isStack && this._url) {
            return await cornerstone.loadAndCacheImage(this._url).then((image: any) => {
                this.readMetadataFromImage(image)
                return image
            })
        } else {
            return {}
        }
    }
    /**
     * Preload the image stack images into cache and sort them by instance number.
     * @param {Function} callback Will call true when ready, false if aborted
     */
    public async preloadAndSortImages (): Promise<object> {
        if (!this._images.length) {
           return { success: false, reason: "Image stack doesn't contain any images" }
        }
        if (!this._preloadProcess) {
            this._preloadProcess = new Promise<object> (async (resolve) => {
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
                        resolve({ success: false, reason: reason })
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
                        resolve({ success: true })
                    }
                }
                resolve({ success: true })
            })
        }
        return this._preloadProcess
    }
    /**
     * Reads and stores metadata from the supplied image. If an image object is not
     * supplied, the image from this object's URL is loaded and cached.
     * @param {Image} image cornerstone Image object (optional for single images)
     */
    public async readMetadataFromImage (image?: any): Promise<boolean> {
        if (!image) {
            // Image stacks require an image as argument
            if (this.isStack || !this._url) {
                return false
            }
            // Load and cache this object's image if it wasn't given as a param
            image = await cornerstone.loadAndCacheImage(this._url).then((loadedImage: any) => {
                return loadedImage
            })
        }
        // Store image metadata
        this._dimensions = [image.width, image.height]
        this._studyID = image.data.string('x00200010') || undefined
        this._studyNumber = parseInt(image.data.string('x00200011') || '0', 10) || undefined
        this._instanceLength = parseInt(image.data.string('x00201208') || '0', 10) || undefined
        this._instanceNumber = parseInt(image.data.string('x00200013') || '0', 10) || undefined
        this._numberOfFrames = image.data.string('x00280008') || undefined
        this._sopClassUID = image.data.string('x00080016') || undefined
        this._sopInstanceUID = image.data.string('x00080018') || undefined
        this._rows = image.data.string('x00280010') || undefined
        this._columns = image.data.string('x00280011') || undefined
        // Display properties
        const imgOrient = image.data.string('x00200037')?.split('\\') || undefined
        if (imgOrient?.length === 6) {
            const rowVec = convertToVector3([parseFloat(imgOrient[0]), parseFloat(imgOrient[1]), parseFloat(imgOrient[2])])
            const colVec = convertToVector3([parseFloat(imgOrient[3]), parseFloat(imgOrient[4]), parseFloat(imgOrient[5])])
            // TODO: Are these sensible reference vectors?
            const rowRef = convertToVector3([1, 0, 0])
            const colRef = convertToVector3([0, 1, 0])
            const radToDeg = 180/Math.PI
            this._imageOrientation = [
                Math.round(rowVec.angleTo(rowRef)*radToDeg),
                Math.round(colVec.angleTo(colRef)*radToDeg)
            ]
        }
        this._sliceThickness = parseFloat(image.data.string('x00180050') || '0') || undefined
        this._sliceLocation = parseFloat(image.data.string('x00201041') || '0') || undefined
        this._KVP = parseFloat(image.data.string('x00180060') || '0') || undefined
        this._exposureTime = parseInt(image.data.string('x00181150') || '0', 10) || undefined
        this._tubeCurrent = parseInt(image.data.string('x00181151') || '0', 10) || undefined
        this._exposure = parseInt(image.data.string('x00181152') || '0', 10) || undefined
        return true
    }
    public removeFromCache = () => {
        if (this.isStack && this._images.length) {
            for (const img of this._images) {
                try {
                    cornerstone.imageCache.removeImageLoadObject(img.url)
                } catch (e) {
                } finally {}
            }
        } else if (this._url) {
            try {
                cornerstone.imageCache.removeImageLoadObject(this._url)
            } catch (e) {
            } finally {}
        }
    }
    public async setCoverImage (image: DicomImageResource | number | null) {
        if (typeof image === 'number' && this._images[image]) {
            this._coverImage = this._images[image]
        } else {
            this._coverImage = image as DicomImageResource | null
        }
        // Preload the image and read metadata from it
        if (this._coverImage) {
            const refImg = await this._coverImage.preloadAndCacheImage()
            if (!this._preloaded) {
                // Get stack metadata from the cover image
                await this.readMetadataFromImage(refImg)
            }
        }
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
        this._images.sort((a: DicomImageResource, b: DicomImageResource) => {
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

export default DicomImage
