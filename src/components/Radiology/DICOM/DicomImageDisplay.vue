<template>

    <div ref="wrapper" class="medigi-viewer-image-wrapper" @mouseleave="hideAnnotationMenu">
        <div ref="annotation-menu"
            :class="[
                'medigi-viewer-delete-annotation',
                { 'medigi-viewer-hidden': !annotationMenu },
            ]"
            @click="annotationMenu.remove()"
            @contextmenu.prevent
        >
            {{ $t('Delete') }}
        </div>
        <div ref="orientation-marker-top"
            :class="[
                'medigi-viewer-orientation-marker',
                'medigi-viewer-orientation-marker-top',
                { 'medigi-viewer-hidden': !orientationMarkers.top },
            ]"
        >
            {{ orientationMarkers.top }}
        </div>
        <div ref="orientation-marker-left"
            :class="[
                'medigi-viewer-orientation-marker',
                'medigi-viewer-orientation-marker-left',
                { 'medigi-viewer-hidden': !orientationMarkers.left },
            ]"
        >
            {{ orientationMarkers.left }}
        </div>
        <div ref="orientation-marker-bottom"
            :class="[
                'medigi-viewer-orientation-marker',
                'medigi-viewer-orientation-marker-bottom',
                { 'medigi-viewer-hidden': !orientationMarkers.bottom },
            ]"
        >
            {{ orientationMarkers.bottom }}
        </div>
        <div ref="orientation-marker-right"
            :class="[
                'medigi-viewer-orientation-marker',
                'medigi-viewer-orientation-marker-right',
                { 'medigi-viewer-hidden': !orientationMarkers.right },
            ]"
        >
            {{ orientationMarkers.right }}
        </div>
        <div ref="container" :id="`container-${id}-${instanceNum}`"
            class="medigi-viewer-image-container"
            @contextmenu.prevent
        >
            <div v-if="!mainImageLoaded" class="medigi-viewer-image-loading">
                {{ $t('LOADING') }}
                <span ref="loading-dot-1" style="visibility: hidden">.</span>
                <span ref="loading-dot-2" style="visibility: hidden">.</span>
                <span ref="loading-dot-3" style="visibility: hidden">.</span>
            </div>
        </div>
        <font-awesome-icon v-if="resource.isStack && isFirstLoaded"
            :icon="resource.isLinked ? ['fal', 'unlink'] : ['fal', 'link']"
            :title="$t('Link this image stack')"
            @click="linkImageStack()"
            :class="{ 'medigi-viewer-link-icon-active' : resource.isLinked }"
            class="medigi-viewer-link-icon"
            fixed-width
        />
        <span v-if="resource.isStack && isFirstLoaded"
            class="medigi-viewer-stack-position"
        >{{ this.resource.currentPosition + 1 }}/{{ this.resource.images.length }}</span>
        <div v-if="resource.topogram" ref="topogram" :id="`topogram-${id}-${instanceNum}`"
            :class="[
                'medigi-viewer-topogram',
                { 'medigi-viewer-hidden': !topoImageLoaded }
            ]"
            @contextmenu.prevent
        >
        </div>
    </div>

</template>

<script lang="ts">
import Vue from 'vue'
import cornerstone from 'cornerstone-core'
import cornerstoneTools from 'cornerstone-tools'
import cornerstoneMath from 'cornerstone-math'
import { ImageResource } from '../../../types/assets'
import TopogramReferenceLineTool from '../../../assets/tools/TopogramReferenceLineTool'
// Some additional Cornerstone Tools methods
const convertToVector3 = cornerstoneTools.importInternal('util/convertToVector3')

let INSTANCE_NUM = 0
const CLICK_DISTANCE_THRESHOLD = 5

export default Vue.extend({
    components: {
    },
    props: {
        containerSize: Array, // The size of the entire image media container as [width, height]
        layoutPosition: Array, // Element position in layout grid [[colPos, cols], [rowPos, rows]]
        linkedStackPos: Number, // Linked stack position
        resource: Object, // DICOMResource or DicomImageStack
        topogram: Object, // DicomImage
        synchronizers: {
            type: Object,
            default: null
        },
    },
    data () {
        return {
            dicomWrapper: null as unknown as HTMLDivElement, // DICOM image wrapper
            dicomEl: null as unknown as HTMLDivElement, // DICOM image element
            topoEl: null as unknown as HTMLDivElement, // Topogram element
            isFirstLoaded: false, // At least one image is loaded
            isLinked: false, // Whether this image is linked or not
            //lastMousePos: [0, 0], // Last mouse position on the screen
            //linkedPos: null as number | null, // Position where this stack was linked
            //mouseLBtnDown: false, // Is the left mouse button down (depressed)
            //mouseMBtnDown: false, // Is the middle mouse button down (depressed)
            //mouseRBtnDown: false, // Is the right mouse button down (depressed)
            //scrollProgress: 0, // Progress towards a scroll step
            annotationMenu: null as object | null, // Annotation selected by the user
            viewport: null as any, // Save viewport settings for image stacks
            orientationMarkers: { top: '', right: '', bottom: '', left: '' },
            // Keep track when the main and possible topogram images have loaded
            mainImageLoaded: false,
            topoImageLoaded: false,
            topoImageBounds: { x: [0, 0], y: [0, 0] },
            // Topogram reference line
            topogramSynchronizer: null as any,
            loadingDotCycle: 0,
            // Don't continue async operations if component has been destroyed
            destroyed: false,
            // Store unsubscribe methods
            unsubscribeActions: null as unknown as Function,
            unsubscribeMutations: null as unknown as Function,
            // We need a way to uniquely identify this component instance's elements
            // from other iterations of the same resource
            instanceNum: INSTANCE_NUM++,
        }
    },
    watch: {
        containerSize (value: Array<number>, old: Array<number>) {
            this.resizeImage()
        },
        layoutPosition (value: Array<number>, old: Array<number>) {
            this.resizeImage()
        },
    },
    computed: {
        /**
         * Shorthand for image resource id
         */
        id () {
            return this.resource.id
        }
    },
    methods: {
        /**
         * Adjust image levels (window width and center) by given values.
         * @param {number} x amount to adjust window width.
         * @param {number} y amount to adjust window center.
         */
        adjustLevels: function (x: number, y: number) {
            this.viewport.voi.windowWidth += (x / this.viewport.scale)
            this.viewport.voi.windowCenter += (y / this.viewport.scale)
            cornerstone.setViewport(this.dicomEl, this.viewport)
        },
        /**
         * Display the single image from this.resource or current image (this.resource.currentPosition) from image stack.
         * @param {boolean} defaultVP use the default viewport settings (resetting any modifications).
         */
        displayImage: async function (defaultVP: boolean, stackPos?: number): Promise<void|object> {
            const imageUrl = this.resource.isStack
                             ? this.resource.images[this.resource.currentPosition].url
                             : this.resource.url
            return await cornerstone.loadImage(imageUrl).then((image: any) => {
                if (defaultVP) {
                    // Set this.viewport to default settings
                    this.viewport = cornerstone.getDefaultViewportForImage(this.dicomEl, image)
                }
                if (this.viewport) {
                    cornerstone.displayImage(this.dicomEl, image, this.viewport)
                }
            })
        },
        flipHorizontally: function () {
            if (this.dicomEl && this.viewport) {
                this.viewport.hflip = !this.viewport.hflip
                this.displayImage(false)
                this.updateOrientationMarkers()
            }
        },
        /**
         * Get topogram dimensions, scaled down if needed.
         * @return [width, height, scale]
         */
        getTopogramDimensions: function (): any {
            if (!this.resource.topogram || !this.topoImageLoaded) {
                return undefined
            }
            const dimensions = this.containerSize as number[]
            const colPos = this.layoutPosition[0] as number[]
            const rowPos = this.layoutPosition[1] as number[]
            const isRowFirst = (colPos[0] === 0)
            const isColLast = (rowPos[0] === rowPos[1] - 1)
            // Remove 20 px for padding
            let hPad = isRowFirst ? 20 : 21
            let vPad = isColLast ? 20 : 21
            const topoBounds = this.resource.topogramPaddedBounds
            const topoW = topoBounds.x[1]-topoBounds.x[0]
            const topoH = topoBounds.y[1]-topoBounds.y[0]
            // Scale it down for smaller viewports
            const maxW = (dimensions[0]/colPos[1] - hPad)*0.25
            const maxH = (dimensions[1]/rowPos[1] - vPad)*0.25
            const scale = Math.min(1, maxW/topoW, maxH/topoH)
            return { width: scale*topoW, height: scale*topoH, scale: scale }
        },
        /**
         * Handle right click (or context menu triggering) event on the image.
         */
        handleRightClick: function (e: any) {
            //const getHandleNearImagePoint = cornerstoneTools.importInternal('manipulators/getHandleNearImagePoint')
            const toolStates = cornerstoneTools.globalImageIdSpecificToolStateManager.saveToolState()
            // Get tool state for currently displayed image
            const localState = this.resource.isStack ?
                               toolStates[this.resource.currentImage.url] : toolStates[this.resource.url]
            // Clicked image coordinates
            const coords = {...e.lastPoints.image}
            if (localState) {
                // Remove annotation method
                const removeAnnotation = (type: string, index: number) => {
                    if (type === 'ang') {
                        localState.Angle.data.splice(index, 1)
                    } else if (type === 'roi') {
                        localState.EllipticalRoi.data.splice(index, 1)
                    } else if (type === 'len') {
                        localState.Length.data.splice(index, 1)
                    }
                    cornerstoneTools.globalImageIdSpecificToolStateManager.restoreToolState(toolStates)
                    cornerstone.updateImage(this.dicomEl, false)
                    this.annotationMenu = null
                }
                // Check if there are any angles, RoIs or lengths on the active image
                if (localState.Angle) {
                    for (let i=0; i<localState.Angle.data.length; i++) {
                        const ang = localState.Angle.data[i]
                        if (cornerstoneMath.point.distance(ang.handles.start, coords) <= CLICK_DISTANCE_THRESHOLD ||
                            cornerstoneMath.point.distance(ang.handles.end, coords) <= CLICK_DISTANCE_THRESHOLD
                        ) {
                            ;(this.$refs['annotation-menu'] as HTMLElement).style.top = `${e.lastPoints.canvas.y + 20}px`
                            ;(this.$refs['annotation-menu'] as HTMLElement).style.left = `${e.lastPoints.canvas.x + 20}px`
                            this.annotationMenu = { remove: () => {
                                removeAnnotation('ang', i)
                            } }
                            return
                        }
                    }
                }
                if (localState.EllipticalRoi) {
                    for (let i=0; i<localState.EllipticalRoi.data.length; i++) {
                        const roi = localState.EllipticalRoi.data[i]
                        if (cornerstoneMath.point.distance(roi.handles.start, coords) <= CLICK_DISTANCE_THRESHOLD ||
                            cornerstoneMath.point.distance(roi.handles.end, coords) <= CLICK_DISTANCE_THRESHOLD
                        ) {
                            ;(this.$refs['annotation-menu'] as HTMLElement).style.top = `${e.lastPoints.canvas.y + 20}px`
                            ;(this.$refs['annotation-menu'] as HTMLElement).style.left = `${e.lastPoints.canvas.x + 20}px`
                            this.annotationMenu = { remove: () => {
                                removeAnnotation('roi', i)
                            } }
                            return
                        }
                    }
                }
                if (localState.Length) {
                    for (let i=0; i<localState.Length.data.length; i++) {
                        const len = localState.Length.data[i]
                        if (cornerstoneMath.point.distance(len.handles.start, coords) <= CLICK_DISTANCE_THRESHOLD ||
                            cornerstoneMath.point.distance(len.handles.end, coords) <= CLICK_DISTANCE_THRESHOLD
                        ) {
                            ;(this.$refs['annotation-menu'] as HTMLElement).style.top = `${e.lastPoints.canvas.y + 20}px`
                            ;(this.$refs['annotation-menu'] as HTMLElement).style.left = `${e.lastPoints.canvas.x + 20}px`
                            this.annotationMenu = { remove: () => {
                                removeAnnotation('len', i)
                            } }
                            return
                        }
                    }
                }
            }
            this.hideAnnotationMenu()
        },
        hideAnnotationMenu: function () {
            this.annotationMenu = null
        },
        /**
         * Trigger the desired effect from mouse move according to the active toolbar tool.
         * @param {MouseEvent} event

        handleMouseMove: function (event: MouseEvent) {
            event.stopPropagation()
            event.preventDefault()
            // Check that EXACTLY one mouse button is down
            let mBtnsDown = 0
            if (this.mouseLBtnDown) {
                mBtnsDown++
            }
            if (this.mouseMBtnDown) {
                mBtnsDown++
            }
            if (this.mouseRBtnDown) {
                mBtnsDown++
            }
            if (mBtnsDown !== 1) {
                return
            }
            // Calculate mouse move
            const deltaX = this.lastMousePos[0] - event.pageX
            const deltaY = this.lastMousePos[1] - event.pageY
            // Update last position
            this.lastMousePos = [event.pageX, event.pageY]
            // Select appropriate response depending on mouse button
            if (this.mouseLBtnDown) {
                // Selecting a tool changes what left mouse button does
                let activeTool = this.$store.state.activeTool
                if (activeTool === null) {
                    // If no tool is active, resort to default
                    this.panImage(deltaX, deltaY)
                } else if (activeTool === 'adjust') {
                    this.adjustLevels(deltaX, deltaY)
                } else if (activeTool === 'area') {
                } else if (activeTool === 'distance') {
                } else if (activeTool === 'link') {
                } else if (activeTool === 'pan') {
                    this.panImage(deltaX, deltaY)
                } else if (activeTool === 'scroll') {
                    if (!this.resource.isStack) {
                        return
                    }
                    // Scroll relative to window height;
                    // - half of image height to scroll the full stack, or
                    // - if the stack has more images than half image heigh (in pixels),
                    //   one image per pixel
                    const yFac = ((this.containerSize[1] as number)/2)/this.resource.images.length > 1
                                 ? ((this.containerSize[1] as number)/2)/this.resource.images.length
                                 : 1
                    // Invert the direction so moving the mouse down will scroll a stack caudally
                    this.scrollProgress -= deltaY
                    if (this.scrollProgress <= -yFac || this.scrollProgress >= yFac) {
                        this.scrollStack(this.scrollProgress < 0
                            ? Math.ceil(this.scrollProgress/yFac) // Round negatives up
                            : Math.floor(this.scrollProgress/yFac) // and positives down
                        )
                        this.scrollProgress = this.scrollProgress%yFac
                    }
                } else if (activeTool === 'zoom') {
                    this.zoomImage(deltaY)
                }
            } else if (this.mouseMBtnDown) {
                this.zoomImage(deltaY)
            } else if (this.mouseRBtnDown) {
                this.adjustLevels(deltaX, deltaY)
            }
        },*/
        /**
         * Invert the image colors values.
         */
        invertImage: function () {
            this.viewport.invert = !this.viewport.invert
            this.displayImage(false)
        },
        /**
         * Link image stack at current index. The link is used both to check if this
         * image stack is linked and to reset its position.
         * @param {boolean} value set this stack as linked or not; toggle if omitted
         */
        linkImageStack: function (value?: boolean) {
            if (!this.resource.isStack) {
                return
            } else if (value === undefined) {
                value = !this.resource.isLinked
            }
            if (this.resource.isLinked !== value) {
                if (value) {
                    this.resource.link(this.$store.state.linkedScrollPosition)
                } else {
                    this.resource.unlink()
                }
            }
        },
        /**
         * Pan image by given coordinates.
         * @param {number} x distance on the x-axis.
         * @param {number} y distance on the y-axis.
         */
        panImage: function (x: number, y: number) {
            this.viewport.translation.x -= (x / this.viewport.scale)
            this.viewport.translation.y -= (y / this.viewport.scale)
            cornerstone.setViewport(this.dicomEl, this.viewport)
        },
        /**
         * Reset the viewport to default state.
         */
        resetViewport: function () {
            this.displayImage(true)
            this.updateOrientationMarkers()
        },
        /**
         * Resize the displayed image into given dimensions.
         */
        resizeImage: function () {
            if (!this.dicomEl || !this.dicomWrapper) {
                return
            }
            const dimensions = this.containerSize as number[]
            const colPos = this.layoutPosition[0] as number[]
            const rowPos = this.layoutPosition[1] as number[]
            const isRowFirst = (colPos[0] === 0)
            const isColLast = (rowPos[0] === rowPos[1] - 1)
            // Remove 20 px for padding
            let hPad = isRowFirst ? 20 : 21
            let vPad = isColLast ? 20 : 21
            this.dicomEl.style.width = `${dimensions[0]/colPos[1] - hPad}px`
            this.dicomEl.style.height = `${dimensions[1]/rowPos[1] - vPad}px`
            this.dicomWrapper.style.borderLeft
                = isRowFirst? 'none' : '1px solid var(--medigi-viewer-border-faint)'
            this.dicomWrapper.style.borderBottom
                = isColLast ? 'none' : '1px solid var(--medigi-viewer-border-faint)'
            // Resize image if it is done loading
            if (this.mainImageLoaded) {
                cornerstone.resize(this.dicomEl, false)
                // Store the resized viewport (or it will reset to initial config when the stack is scrolled)
                this.viewport = cornerstone.getViewport(this.dicomEl)
                //cornerstone.setViewport(this.dicomEl, this.viewport)
            } else {
                // Update the loading text position
                const loadingText = (document.querySelector(
                        `#container-${this.id}-${this.instanceNum} > .medigi-viewer-image-loading`
                    ) as HTMLDivElement)
                loadingText.style.width = `${dimensions[0]/colPos[1] - hPad}px`
                loadingText.style.height = `${dimensions[1]/rowPos[1] - vPad}px`
                loadingText.style.lineHeight = `${dimensions[1]/rowPos[1] - vPad}px`
            }
            // Resize possible topogram image
            if (this.resource.topogram && this.topoImageLoaded) {
                const topoSize = this.getTopogramDimensions()
                // Add 2 pixels for borders
                this.topoEl.style.width = `${topoSize.width + 2}px`
                this.topoEl.style.height = `${topoSize.height + 2}px`
                //this.topoEl.style.transform = `scale(${Math.min(1, maxW/topoW, maxH/topoH)})`
                cornerstone.resize(this.topoEl, false)
            }
            this.updateOrientationMarkers()
        },
        rotateBy: function (angle: number) {
            if (this.dicomEl && this.viewport) {
                this.viewport.rotation += angle
                this.displayImage(false)
                this.updateOrientationMarkers()
            }
        },
        /**
         * Scroll the linked image stack, returning a promise that is fulfilled when the scrolling is
         * complete. Promise will call true on success, false on failure.
         * @param {string} oId id of the origin resource
         * @param {number} relPos the relative master link position
         */
        scrollLinkedStack: async function (oId: string, relPos: number) {
            if (!this.resource.isStack || !this.resource.isLinked || oId === this.id) {
                return
            }
            // Position must be computed relative to linking point and master linking position
            const locPos = (this.resource.linkedPosition || 0)/this.resource.images.length
                           + relPos - (this.resource.masterLinkPosition || 0)
            // Corrected local position must be between 0 and 1 (= 0 and 100% of image stack)
            if (locPos >= 0 && locPos <= 1) {
                // Check if we're already at the position.
                // This is very likely if the origin stack has more images than this stack
                // -> several origin stack images will map to the same local image
                const absPos = Math.round(locPos*this.resource.images.length)
                if (absPos !== this.resource.currentPosition) {
                    // Don't scroll out of bounds
                    if (absPos < 0 ) {
                        this.resource.currentPosition = 0
                    } else if (absPos >= this.resource.images.length) {
                        this.resource.currentPosition = this.resource.images.length - 1
                    } else {
                        this.resource.currentPosition = absPos
                    }
                    await this.displayImage(false)
                    // Fetch the current tool state properties and update current image index
                    // to keep the scroll stack tool in sync with these changes
                    const opts = cornerstoneTools.getToolState(this.dicomEl, 'stack').data[0]
                    opts.currentImageIdIndex = this.resource.currentPosition
                    cornerstoneTools.clearToolState(this.dicomEl, 'stack') // Remove old and add new
                    cornerstoneTools.addToolState(this.dicomEl, 'stack', opts)
                }
            }
            return true
        },
        /**
         * Scroll the image stack.
         * @param {number} delta positive or negative number (if absolute is false), or the absolute stack position.
         * @param {boolean} absolute use delta as absolute stack position (default false).
         * @param {boolean} announce announce new position to synchronize linked stacks (default true).

        scrollStack: async function (delta: number, absolute: boolean = false, announce: boolean = true) {
            if (!this.resource.isStack) {
                return
            }

            // Check if this stack is linked and trigger an event if it is
            if (this.isLinked && announce) {
                // Calculate current position relative to linked position, and add master link position
                const relPos = (this.resource.currentPosition - (this.linkedPos || 0))/this.resource.images.length
                               + (this.masterLinkPos || 0)
                this.$store.commit('set-linked-scroll-position', { origin: this.id, position: relPos })
                // Update stack scroll tool position
            }
        },*/
        /**
         * Call when stack scroll tool displays a new image

        stackScrolled (e: any, silent?: boolean) {
            const newStackIndex = this.resource.getIndexByUrl(e.detail.image.imageId)
            if (this.isLinked && !silent) {
                // Calculate current position relative to linked position, and add master link position
                const relPos = (this.resource.currentPosition - (this.linkedPos || 0))/this.resource.images.length
                               + (this.masterLinkPos || 0)
                this.$store.commit('set-linked-scroll-position', { origin: this.id, position: relPos })
            }
            this.resource.currentPosition = newStackIndex
        },*/
        /**
         * Refresh the topogram when a new stack image is displayed.
         */
        synchronizerTopogram: function (e: any) {
            //console.log(this.resource.getRefLineForImage(imageId))
        },
        /**
         * Unlink this image stack.
        unlinkImageStack: function () {
            this.linkedOffset = null
        },
         */
        /**
         * Update the displayed orientation markers when image orientation has changed.
         * Cornerstone Tools orientation markers prints the markers at the edges of the image, which can be troublesome
         * when zooming and panning the image.
         * This method is mostly copied from the aforementioned tool.
         */
        updateOrientationMarkers: function () {
            if (!this.mainImageLoaded) {
                return
            }
            const imagePlane = cornerstone.metaData.get(
                'imagePlaneModule',
                this.resource.currentImage.url
            ) as any
            if (!imagePlane || !imagePlane.rowCosines || !imagePlane.columnCosines) {
                return
            }
            const rowVec3 = convertToVector3(imagePlane.rowCosines)
            const rowAbs = new cornerstoneMath.Vector3(
                Math.abs(rowVec3.x), Math.abs(rowVec3.y), Math.abs(rowVec3.z)
            )
            const ds = [this.$t('orientation.right'), this.$t('orientation.left')]
            const ap = [this.$t('orientation.anterior'), this.$t('orientation.posterior')]
            const cc = [this.$t('orientation.cranial'), this.$t('orientation.caudal')]
            if (rowVec3.x < 0) ds.reverse()
            if (rowVec3.y < 0) ap.reverse()
            if (rowVec3.z < 0) cc.reverse()
            const colVec3 = convertToVector3(imagePlane.columnCosines)
            const colAbs = new cornerstoneMath.Vector3(
                Math.abs(colVec3.x), Math.abs(colVec3.y), Math.abs(colVec3.z)
            )
            // Here is the main difference: I feel the default tool uses way too small a threshold for the
            // image plane angle and shows confusing values if it is even the slightest bit askew
            const MIN = 0.5 // Has to be within 60 deg of the axis (cos(60deg))
            const markers = {
                bottom: '', left: '', right: '', top: '' // Start with empty labels
            }
            // First left and right markers
            for (let i = 0; i < 3; i++) {
                if (rowAbs.x >= MIN && rowAbs.x > rowAbs.y && rowAbs.x > rowAbs.z) {
                    markers.left += ds[0].toString()
                    markers.right += ds[1].toString()
                    rowAbs.x = 0
                } else if (rowAbs.y >= MIN && rowAbs.y > rowAbs.x && rowAbs.y > rowAbs.z) {
                    markers.left += ap[0].toString()
                    markers.right += ap[1].toString()
                    rowAbs.y = 0
                } else if (rowAbs.z >= MIN && rowAbs.z > rowAbs.x && rowAbs.z > rowAbs.y) {
                    markers.left += cc[0].toString()
                    markers.right += cc[1].toString()
                    rowAbs.z = 0
                } else if (rowAbs.x >= MIN && rowAbs.y >= MIN && rowAbs.x === rowAbs.y) {
                    markers.left += ds[0].toString() + ap[0].toString()
                    markers.right += ds[1].toString() + ap[1].toString()
                    rowAbs.x = 0
                    rowAbs.y = 0
                } else if (rowAbs.x >= MIN && rowAbs.z >= MIN && rowAbs.x === rowAbs.z) {
                    markers.left += ds[0].toString() + cc[0].toString()
                    markers.right += ds[1].toString() + cc[1].toString()
                    rowAbs.x = 0
                    rowAbs.z = 0
                } else if (rowAbs.y >= MIN && rowAbs.z >= MIN && rowAbs.y === rowAbs.z) {
                    markers.left += ap[0].toString() + cc[0].toString()
                    markers.right += ap[1].toString() + cc[1].toString()
                    rowAbs.y = 0
                    rowAbs.z = 0
                } else {
                    break
                }
            }
            // Then top and bottom markers
            for (let i = 0; i < 3; i++) {
                if (colAbs.x >= MIN && colAbs.x > colAbs.y && colAbs.x > colAbs.z) {
                    markers.top += ds[0].toString()
                    markers.bottom += ds[1].toString()
                    colAbs.x = 0
                } else if (colAbs.y >= MIN && colAbs.y > colAbs.x && colAbs.y > colAbs.z) {
                    markers.top += ap[0].toString()
                    markers.bottom += ap[1].toString()
                    colAbs.y = 0
                } else if (colAbs.z >= MIN && colAbs.z > colAbs.x && colAbs.z > colAbs.y) {
                    markers.top += cc[0].toString()
                    markers.bottom += cc[1].toString()
                    colAbs.z = 0
                } else if (colAbs.x >= MIN && colAbs.y >= MIN && colAbs.x === colAbs.y) {
                    markers.top += ds[0].toString() + ap[0].toString()
                    markers.bottom += ds[1].toString() + ap[1].toString()
                    colAbs.x = 0
                    colAbs.y = 0
                } else if (colAbs.x >= MIN && colAbs.z >= MIN && colAbs.x === colAbs.z) {
                    markers.top += ds[0].toString() + cc[0].toString()
                    markers.bottom += ds[1].toString() + cc[1].toString()
                    colAbs.x = 0
                    colAbs.z = 0
                } else if (colAbs.y >= MIN && colAbs.z >= MIN && colAbs.y === colAbs.z) {
                    markers.top += ap[0].toString() + cc[0].toString()
                    markers.bottom += ap[1].toString() + cc[1].toString()
                    colAbs.y = 0
                    colAbs.z = 0
                } else {
                    break
                }
            }
            // Detect and correct for inversion and rotation of the image.
            // There should be a way to get the initial vector to include this, but I haven't found it.
            if (this.viewport) {
                if (this.viewport.hflip) {
                    [markers.left, markers.right] = [markers.right, markers.left]
                }
                if (this.viewport.vflip) {
                    [markers.top, markers.bottom] = [markers.bottom, markers.top]
                }
                if (this.viewport.rotation > 45) {
                    for (let i=this.viewport.rotation; i>45; i=i-90) {
                        // Rotate markers 90 degrees at a time
                        [markers.top, markers.right, markers.bottom, markers.left]
                            = [markers.left, markers.top, markers.right, markers.bottom]
                    }
                } else if (this.viewport.rotation < -45) {
                    for (let i=this.viewport.rotation; i<-45; i=i+90) {
                        [markers.top, markers.right, markers.bottom, markers.left]
                            = [markers.right, markers.bottom, markers.left, markers.top]
                    }
                }
            }
            this.orientationMarkers = {...markers}
            // Update marker positions
            const leftOffset = `${this.dicomEl.offsetWidth/2 - 20}px`
            const topOffset = `${this.dicomEl.offsetHeight/2 - 20}px`
            ;(this.$refs['orientation-marker-top'] as HTMLElement).style.left = leftOffset
            ;(this.$refs['orientation-marker-bottom'] as HTMLElement).style.left = leftOffset
            ;(this.$refs['orientation-marker-left'] as HTMLElement).style.top = topOffset
            ;(this.$refs['orientation-marker-right'] as HTMLElement).style.top = topOffset
        },
        /**
         * Zoom in our out of the displayed image.
         * @param {number} z zoom amount in percents.
         */
        zoomImage: function (z: number) {
            this.viewport.scale *= 1 + z*0.01
            cornerstone.setViewport(this.dicomEl, this.viewport)
        }
    },
    mounted () {
        this.dicomWrapper = this.$refs[`wrapper`] as HTMLDivElement
        this.dicomEl = this.$refs[`container`] as HTMLDivElement
        this.topoEl = this.$refs[`topogram`] as HTMLDivElement
        if (this.dicomEl) {
            // Trigger first component resize to show the borders and loading text
            this.resizeImage()
            // Add event listener
            this.dicomEl.addEventListener('cornerstonetoolsmouseclick', (e: any) => {
                if (e.detail.event.button === 2) {
                    // Right mouse click
                    this.handleRightClick(e.detail)
                } else if (!e.detail.event.button && this.annotationMenu) {
                    // Hide annotation menu on left mouse click
                    this.annotationMenu = null
                }
            })
            // Start loading dot cycle every half second until the image is done loading
            let cyclePos = 1
            this.loadingDotCycle = window.setInterval(() => {
                for (let i=0; i<3; i++) {
                    (this.$refs[`loading-dot-${i+1}`] as HTMLElement).style.visibility
                        = i < cyclePos ? 'visible' : 'hidden'
                }
                cyclePos = cyclePos < 3 ? cyclePos + 1 : 0
            }, 500)
            const showLoadingError = (reason: any) => {
                window.clearInterval(this.loadingDotCycle)
                //;(document.querySelector(
                //        `#container-${this.id}-${this.instanceNum} > .medigi-viewer-image-loading`
                //    ) as HTMLDivElement).innerText = this.$t('ERROR').toString()
                console.error(reason)
            }
            // Enable the element
            cornerstone.enable(this.dicomEl)
            //this.dicomEl.addEventListener('cornerstonenewimage', this.stackScrolled)
            // Bind mouse interaction listeners
            /*
            this.dicomEl.addEventListener('mousedown', (event) => {
                // Do not handle events until viewport has been set up
                if (!this.viewport) {
                    return
                }
                event.stopPropagation()
                event.preventDefault()
                // Catch which button was pressed
                if (event.button === MOUSE_BUTTON.LEFT) {
                    this.mouseLBtnDown = true
                } else if (event.button === MOUSE_BUTTON.MIDDLE) {
                    this.mouseMBtnDown = true
                } else if (event.button === MOUSE_BUTTON.RIGHT) {
                    this.mouseRBtnDown = true
                }
                this.lastMousePos = [event.pageX, event.pageY]
                this.dicomEl.addEventListener('mousemove', this.handleMouseMove)
            })
            this.dicomEl.addEventListener('mouseup', (event) => {
                // Do not handle events until viewport has been set up
                if (!this.viewport) {
                    return
                }
                event.stopPropagation()
                event.preventDefault()
                // Catch which button was released
                if (event.button === MOUSE_BUTTON.LEFT) {
                    this.mouseLBtnDown = false
                } else if (event.button === MOUSE_BUTTON.MIDDLE) {
                    this.mouseMBtnDown = false
                } else if (event.button === MOUSE_BUTTON.RIGHT) {
                    this.mouseRBtnDown = false
                }
                this.dicomEl.removeEventListener('mousemove', this.handleMouseMove)
            })
            // Bind default mouse wheel event
            this.dicomEl.addEventListener('wheel', (event: WheelEvent) => {
                // Do not handle events until viewport has been set up
                if (!this.viewport) {
                    return
                }
                event.stopPropagation()
                event.preventDefault()
                // Default event depends on image count
                if (this.resource.images.length > 1) {
                    // For an image stack, bind mouse wheel to stack scroll
                    if (event.deltaY > 0) {
                        this.scrollStack(1)
                    } else if (event.deltaY < 0) {
                        this.scrollStack(-1)
                    }
                } else {
                    // For single image, bind it to zoom
                    if (event.deltaY > 0) {
                        this.zoomImage(-5)
                    } else if (event.deltaY < 0) {
                        this.zoomImage(5)
                    }
                }
            })
            */
            // Save viewport
            this.viewport = cornerstone.getViewport(this.dicomEl)
            // Conerstone tool options
            const zoomOpts = {
                configuration: {
                    invert: true,
                    preventZoomOutsideImage: false,
                    minScale: .1,
                    maxScale: 20.0,
                }
            }
            // Set up basic tools
            cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.AngleTool)
            cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.CrosshairsTool)
            this.synchronizers.crosshairs.add(this.dicomEl)
            cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.EllipticalRoiTool)
            cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.LengthTool)
            //cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.OrientationMarkersTool)
            cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.PanTool)
            cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.WwwcTool)
            cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.ZoomTool, zoomOpts)
            // Sort the images if the resource is an image stack
            if (this.resource.isStack) {
                // Add stack state manager to loaded images
                this.resource.preloadAndSortImages().then((response: { success: boolean, reason?: any }) => {
                    // Check that dicomEl still exists, in case the container has been destroyed during the load
                    if (response.success && !this.destroyed) {
                        // Stop loading dot cycler
                        window.clearInterval(this.loadingDotCycle)
                        this.mainImageLoaded = true
                        // Set up cornerstone stack scroll tool
                        const imageIds = this.resource.images.map((img: ImageResource) => img.url)
                        const stackOpts = {
                            currentImageIdIndex: this.resource.currentPosition,
                            imageIds
                        }
                        cornerstoneTools.addStackStateManager(this.dicomEl, ['stack', 'Crosshairs'])
                        cornerstoneTools.addToolState(this.dicomEl, 'stack', stackOpts)
                        cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.StackScrollTool)
                        cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.StackScrollMouseWheelTool)
                        // Register element to synchronizers
                        this.synchronizers.stackScroll.add(this.dicomEl)
                        this.synchronizers.referenceLines.add(this.dicomEl)
                        // Display orietation markers (must be called after image is loaded
                        cornerstoneTools.setToolActive('OrientationMarkers', {})
                        // Add reference lines tool (must be done after setting up synchronizers!)
                        this.resource.currentPosition = this.resource.currentPosition
                        const displayMainImage = () => {
                            // Shorthand for these operations, as they are needed in a few (async) paths
                            this.$store.dispatch('tools:re-enable-active')
                            this.displayImage(true)
                            Vue.nextTick(() => {
                                // Don't trigger resize if the container has been destroyed
                                if (!this.destroyed) {
                                    this.resizeImage()
                                }
                            })
                        }
                        // Display possible topogram
                        if (this.resource.topogram !== null) {
                            cornerstone.enable(this.topoEl)
                            cornerstone.loadImage(this.resource.topogram.url).then((image: any) => {
                                this.topoImageLoaded = true
                                const vp = cornerstone.getDefaultViewportForImage(this.topoEl, image)
                                // Set displayed area on the topogram
                                const topoBounds = this.resource.topogramPaddedBounds
                                vp.displayedArea.tlhc.x = topoBounds.x[0]
                                vp.displayedArea.tlhc.y = topoBounds.y[0]
                                vp.displayedArea.brhc.x = topoBounds.x[1]
                                vp.displayedArea.brhc.y = topoBounds.y[1]
                                vp.displayedArea.columnPixelSpacing = 1
                                vp.displayedArea.rowPixelSpacing = 1
                                vp.displayedArea.presentationSizeMode = 'SCALE TO FIT'
                                cornerstone.setViewport(this.topoEl, vp)
                                // Add event listener for new images to update the topogram
                                //this.dicomEl.addEventListener('cornerstonenewimage', this.refreshTopogram)
                                // We need to pass stack tools even to single images to enable reference lines
                                //const stackOpts = {
                                //    currentImageIdIndex: 0,
                                //    imageIds: [this.resource.url]
                                //}
                                //cornerstoneTools.addStackStateManager(this.topoEl, ['stack', 'Crosshairs'])
                                //cornerstoneTools.addToolState(this.topoEl, 'stack', stackOpts)
                                // Display the topogram and set up synchronizer
                                cornerstone.displayImage(this.topoEl, image, vp)
                                this.topogramSynchronizer = new cornerstoneTools.Synchronizer(
                                    'cornerstonenewimage',
                                    (synchronizer: any, source: any, target: any, event: any) => {
                                        cornerstone.updateImage(this.topoEl, false)
                                    }
                                )
                                this.topogramSynchronizer.add(this.dicomEl)
                                cornerstoneTools.addToolForElement(this.topoEl, TopogramReferenceLineTool,
                                    // Unique name to prevent tools from different topograms from conflicting with each other
                                    { name: `TopogramReferenceLines-${this.instanceNum}` }
                                )
                                cornerstoneTools.setToolEnabled(`TopogramReferenceLines-${this.instanceNum}`, {
                                    synchronizationContext: this.topogramSynchronizer,
                                    // Pass a custom method to the reference line tool to get cropped and scaled line dimensions
                                    getReferenceLine: () => {
                                        const refLine = this.resource.getRefLineForImage()
                                        const topoDims = this.getTopogramDimensions()
                                        if (!refLine || !topoDims) {
                                            return undefined
                                        }
                                        if (topoDims.scale < 1) {
                                            refLine.start = {
                                                x: refLine.start.x/topoDims.scale,
                                                y: refLine.start.y/topoDims.scale
                                            },
                                            refLine.end = {
                                                x: refLine.end.x/topoDims.scale,
                                                y: refLine.end.y/topoDims.scale
                                            }
                                        }
                                        return refLine
                                    },
                                })
                                displayMainImage()
                            }).catch((reason: any) => {
                                console.error('Loading topogram failed!', reason)
                                displayMainImage()
                            })
                        } else {
                            displayMainImage()
                        }
                        this.$store.commit('set-cache-status', cornerstone.imageCache.getCacheInfo())
                        this.isFirstLoaded = true
                        // Save new position
                        this.dicomEl.addEventListener('cornerstonenewimage', (e: any) => {
                            this.resource.setCurrentPositionByUrl(e.detail.image.imageId)
                        })
                    } else if (!this.destroyed) {
                        // TODO: Return the reason somehow?
                        showLoadingError(response.reason)
                    }
                }).catch((reason: any) => {
                    showLoadingError(reason)
                })
            } else {
                // Display first image with default settings
                this.displayImage(true).then(image => {
                    window.clearInterval(this.loadingDotCycle)
                    this.mainImageLoaded = true
                    // We need to pass stack tools even to single images to enable reference lines
                    //const stackOpts = {
                    //    currentImageIdIndex: 0,
                    //    imageIds: [this.resource.url]
                    //}
                    //cornerstoneTools.addStackStateManager(this.dicomEl, ['stack', 'Crosshairs'])
                    //cornerstoneTools.addToolState(this.dicomEl, 'stack', stackOpts)
                    // Register element to synchronizers
                    //this.$root.synchronizers.referenceLines.add(this.dicomEl)
                    // Add reference lines tool (must be done after setting up synchronizers!)
                    //cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.ReferenceLinesTool)
                    // Display orietation markers (must be called after image is loaded
                    cornerstoneTools.setToolActive('OrientationMarkers', {})
                    // Re-enable the active tool to include this image
                    this.$store.dispatch('tools:re-enable-active')
                    this.isFirstLoaded = true
                    Vue.nextTick(() => {
                        this.resizeImage()
                    })
                }).catch((reason: any) => {
                    showLoadingError(reason)
                })
            }
            // Subscribe to store dispatch events
            this.unsubscribeActions = this.$store.subscribeAction((action) => {
                switch (action.type) {
                    case 'image:flip-horizontally':
                        this.flipHorizontally()
                        break
                    case 'image:invert-colors':
                        this.invertImage()
                        break
                    case 'image:link-stacks':
                        this.linkImageStack(action.payload)
                        break
                    case 'image:restore-default-settings':
                        this.resetViewport()
                        break
                    case 'image:rotate-by':
                        this.rotateBy(action.payload)
                        break
                }
            })
            // Subscribe to store commit events
            this.unsubscribeMutations = this.$store.subscribe((mutation) => {
                switch (mutation.type) {
                    case 'set-linked-scroll-position':
                        this.scrollLinkedStack(mutation.payload.origin, mutation.payload.position)
                        break
                }
            })
        }
    },
    beforeDestroy () {
        this.destroyed = true
        // Clear loading indicator interval if it is running
        if (this.loadingDotCycle) {
            window.clearInterval(this.loadingDotCycle)
        }
        if (this.resource.isStack && this.resource.isLinked) {
            // Break linking
            this.resource.unlink()
        }
        // Remove tools
        if (this.mainImageLoaded) {
            try {
                // If the component is destroyed before all of the setup is done, some of these may throw errors
                cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.AngleTool)
                cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.CrosshairsTool)
                cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.EllipticalRoiTool)
                cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.LengthTool)
                //cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.OrientationMarkersTool)
                cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.PanTool)
                cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.WwwcTool)
                cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.ZoomTool)
                if (this.resource.isStack) {
                    // Remove stack-specific tools
                    cornerstoneTools.clearToolState(this.dicomEl, 'stack')
                    cornerstoneTools.clearToolState(this.dicomEl, 'Crosshairs')
                    cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.StackScrollTool)
                    cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.StackScrollMouseWheelTool)
                    cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.ReferenceLinesTool)
                    // Unregister synchronizers
                    this.synchronizers.stackScroll.remove(this.dicomEl)
                    this.synchronizers.referenceLines.remove(this.dicomEl)
                }
                // Disable the element
                cornerstone.disable(this.dicomEl)
            } catch (e) {}
        }
        if (this.resource.topogram && this.topoImageLoaded) {
            try {
                // Same for topogram
                //cornerstoneTools.clearToolState(this.topoEl, 'stack')
                //cornerstoneTools.clearToolState(this.topoEl, 'Crosshairs')
                cornerstoneTools.setToolDisabled(`TopogramReferenceLines-${this.instanceNum}`)
                cornerstoneTools.removeToolForElement(this.topoEl, TopogramReferenceLineTool)
                //cornerstoneTools.removeToolForElement(this.topoEl, cornerstoneTools.ReferenceLinesTool)
                //this.synchronizers.stackScroll.remove(this.topoEl)
                //this.synchronizers.referenceLines.remove(this.topoEl)
                cornerstone.disable(this.topoEl)
            } catch (e) {}
        }
        // Unsubscribe from store
        this.unsubscribeActions()
        this.unsubscribeMutations()
    },
})

</script>

<style scoped>
.medigi-viewer-image-wrapper {
    position: relative;
    float: left;
    padding: 10px;
}
    .medigi-viewer-image-wrapper > .medigi-viewer-delete-annotation {
        position: absolute;
        display: inline-block;
        border: 2px solid var(--medigi-viewer-border);
        background-color: var(--medigi-viewer-background);
        padding: 10px;
        cursor: pointer;
        z-index: 1000; /* ALWAYS on top */
    }
        .medigi-viewer-image-wrapper > .medigi-viewer-delete-annotation:hover {
            background-color: var(--medigi-viewer-background-highlight);
        }
    .medigi-viewer-image-wrapper > .medigi-viewer-orientation-marker {
        position: absolute;
        display: inline-block;
        width: 40px;
        height: 40px;
        line-height: 40px;
        text-align: center;
        z-index: 999; /* Almost on top */
        pointer-events: none;
    }
        .medigi-viewer-image-wrapper > .medigi-viewer-orientation-marker-bottom {
            bottom: 0;
        }
        .medigi-viewer-image-wrapper > .medigi-viewer-orientation-marker-left {
            left: 0;
        }
        .medigi-viewer-image-wrapper > .medigi-viewer-orientation-marker-right {
            right: 0;
        }
        .medigi-viewer-image-wrapper > .medigi-viewer-orientation-marker-top {
            top: 0;
        }
    .medigi-viewer-image-wrapper > .medigi-viewer-link-icon {
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 20px;
        cursor: pointer;
        color: var(--medigi-viewer-text-faint);
    }
    .medigi-viewer-image-wrapper > .medigi-viewer-link-icon-active {
        color: var(--medigi-viewer-text-main);
    }
    .medigi-viewer-image-wrapper > .medigi-viewer-stack-position {
        position: absolute;
        left: 10px;
        bottom: 10px;
        pointer-events: none;
        color: var(--medigi-viewer-text-faint);
    }
    .medigi-viewer-image-wrapper > .medigi-viewer-topogram {
        position: absolute;
        right: -1px; /* cover the default image border */
        bottom: -1px;
        height: 20%;
        pointer-events: none;
        border: solid 1px var(--medigi-viewer-border-faint);
        background-color: var(--medigi-viewer-background);
        transform-origin: bottom right;
    }
        .medigi-viewer-image-container > div {
            font-size: 24px;
            font-family: sans-serif;
            font-weight: bold;
            font-style: italic;
            color: var(--medigi-viewer-text-faint);
            text-align: center;
        }
</style>
