<template>

    <div ref="wrapper" class="medimg-viewer-image-wrapper" @mouseleave="mouseLeftImageArea">
        <div ref="annotation-menu"
            :class="[
                'medimg-viewer-annotation-menu',
                { 'medimg-viewer-hidden': !annotationMenu },
            ]"
            :style="getAnnotationMenuStyles()"
            @contextmenu.prevent
        >
            <div v-if="!isSelectedAnnotation"  class="medimg-viewer-annotation-action" @click="annotationMenu.select()">
                {{ t('Select as reference #{n}', { n: getNextFreeReferenceNum() }) }}
            </div>
            <div v-else class="medimg-viewer-annotation-action" @click="annotationMenu.unselect()">
                {{ t('Unselect reference #{n}', { n: getReferenceNumber() }) }}
            </div>
            <div v-for="(ref, idx) in getReferenceAnnotations()" :key="`medimg-viewer-compare-annotations-${id}-${instanceNum}-${idx}`">
                <div v-if="ref" class="medimg-viewer-annotation-compare-title">{{ t('Compared to reference #{n}', { n: (idx + 1) }) }}</div>
                <div v-if="ref" class="medimg-viewer-annotation-compare-row">
                    <span>{{ t('Length') }}</span>
                    <span>{{ getAnnotationLengthDiff(ref, annotationMenu.data) }}</span>
                </div>
                <div v-if="ref" class="medimg-viewer-annotation-compare-row">
                    <span>{{ t('Angle') }}</span>
                    <span>{{ getAnnotationAngleBetween(ref, annotationMenu.data) }}</span>
                </div>
            </div>
            <div @click="annotationMenu.remove()" class="medimg-viewer-annotation-action">
                {{ t('Delete') }}
            </div>
        </div>
        <div ref="orientation-marker-top"
            :class="[
                'medimg-viewer-orientation-marker',
                'medimg-viewer-orientation-marker-top',
                { 'medimg-viewer-hidden': !orientationMarkers.top },
            ]"
        >
            {{ orientationMarkers.top }}
        </div>
        <div ref="orientation-marker-left"
            :class="[
                'medimg-viewer-orientation-marker',
                'medimg-viewer-orientation-marker-left',
                { 'medimg-viewer-hidden': !orientationMarkers.left },
            ]"
        >
            {{ orientationMarkers.left }}
        </div>
        <div ref="orientation-marker-bottom"
            :class="[
                'medimg-viewer-orientation-marker',
                'medimg-viewer-orientation-marker-bottom',
                { 'medimg-viewer-hidden': !orientationMarkers.bottom },
            ]"
        >
            {{ orientationMarkers.bottom }}
        </div>
        <div ref="orientation-marker-right"
            :class="[
                'medimg-viewer-orientation-marker',
                'medimg-viewer-orientation-marker-right',
                { 'medimg-viewer-hidden': !orientationMarkers.right },
            ]"
        >
            {{ orientationMarkers.right }}
        </div>
        <div ref="container" :id="`container-${id}-${instanceNum}`"
            :class="[
                'medimg-viewer-image-container',
                { 'medimg-viewer-image-disabled': $store.state.imageResourceLoading }
            ]"
            @contextmenu.prevent
        >
            <div v-if="!mainImageLoaded" class="medimg-viewer-image-loading">
                {{ t('Loading') }}
                <span ref="loading-dot-1" style="visibility: hidden">.</span>
                <span ref="loading-dot-2" style="visibility: hidden">.</span>
                <span ref="loading-dot-3" style="visibility: hidden">.</span>
            </div>
        </div>
        <!-- Image tools -->
        <span class="medimg-viewer-tool-icons">
            <font-awesome-icon v-if="resource.isStack && isFirstLoaded"
                :icon="resource.isLinked ? ['fal', 'link'] : ['fal', 'unlink']"
                :title="t('Link this image stack')"
                @click="linkImageStack()"
                :class="{ 'medimg-viewer-link-icon-active' : resource.isLinked }"
                fixed-width
            />
            <font-awesome-icon v-if="isFirstLoaded"
                :icon="['fal', 'reply-all']"
                :title="t('Reset all adjustments')"
                @click="displayImage(true)"
                fixed-width
            />
        </span>
        <!-- Metadata -->
        <div v-if="isFirstLoaded" class="medimg-viewer-meta-topleft">
            <div>{{ resource.name }}</div>
        </div>
        <div v-if="isFirstLoaded" class="medimg-viewer-meta-topright">
            <div>{{ resource.dimensions[0] }} x {{ resource.dimensions[1] }}</div>
        </div>
        <div v-if="isFirstLoaded" class="medimg-viewer-meta-bottomleft">
            <div v-if="resource.currentImage.tubeCurrent && resource.currentImage.exposureTime && resource.currentImage.exposure">
                Exp: {{ resource.currentImage.tubeCurrent }} mA,
                     {{ resource.currentImage.exposureTime }} msec,
                     {{ resource.currentImage.exposure }} mAs
            </div>
            <div v-if="resource.isStack">
                {{ t('Slice') }}: {{ resource.currentPosition + 1 }}/{{ resource.images.length }}
            </div>
            <div v-if="resource.isStack && resource.currentImage.sliceLocation">
                Loc: {{ resource.currentImage.sliceLocation }} mm
            </div>
            <div v-if="resource.isStack && resource.currentImage.sliceThickness">
                Thk: {{ resource.currentImage.sliceThickness.toFixed(1) }} mm
            </div>
            <div v-if="resource.isStack && resource.currentImage.KVP">
                KVP: {{ resource.currentImage.KVP }} kV
            </div>
        </div>
        <div class="medimg-viewer-meta-bottomright">
            <!-- Topogram -->
            <div v-if="resource.topogram" ref="topogram" :id="`topogram-${id}-${instanceNum}`"
                :class="[
                    'medimg-viewer-topogram',
                    { 'medimg-viewer-hidden': !topoImageLoaded }
                ]"
                @contextmenu.prevent
            >
            </div>
            <div v-if="isFirstLoaded && resource.imageOrientation &&
                       (!isNaN(resource.imageOrientation[0]) || !isNaN(resource.imageOrientation[1]))
            ">
                Orient: {{ !isNaN(resource.imageOrientation[0]) ? resource.imageOrientation[0] : '-- ' }}°
                        / {{ !isNaN(resource.imageOrientation[1]) ? resource.imageOrientation[1] : '-- ' }}°
            </div>
        </div>
        <!-- Loading indicator -->
        <div :class="[
            'medimg-viewer-image-loading-progress',
            { 'medimg-viewer-hidden': mainImageLoaded || !resource.isStack }
        ]">
            <div ref="loading-progress-bar"></div>
        </div>
    </div>

</template>

<script lang="ts">
import Vue from 'vue'
import * as cornerstone from 'cornerstone-core'
import cornerstoneTools from 'cornerstone-tools'
import cornerstoneMath from 'cornerstone-math'
import DicomImage from '../../../assets/dicom/DicomImage'
import TopogramReferenceLineTool from '../../../assets/tools/TopogramReferenceLineTool'
// Some additional Cornerstone Tools methods
const convertToVector3 = cornerstoneTools.importInternal('util/convertToVector3')

let INSTANCE_NUM = 0
const CLICK_DISTANCE_THRESHOLD = 7.5

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
            annotationMenu: null as any, // Annotation selected by the user
            orientationMarkers: { top: '', right: '', bottom: '', left: '' },
            // Keep track when the main and possible topogram images have loaded
            mainImageLoaded: false,
            topoImageLoaded: false,
            topoImageBounds: { x: [0, 0], y: [0, 0] },
            // Topogram reference line
            topogramSynchronizer: null as any,
            loadingDotCycle: 0,
            // Cache some viewport properties
            viewportProps: null as any,
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
            // This REALLY has to be called twice or annotation menu position breaks.
            // It has something to do with the viewport scale not updating on the first go.
            this.resizeImage()
            this.resizeImage(true)
        },
        resource: {
            deep: true,
            handler (value: any) {
                if (!this.mainImageLoaded && this.$refs['loading-progress-bar']) {
                    (this.$refs['loading-progress-bar'] as HTMLDivElement).style.width = `${100*value.preloaded/value.images.length}%`
                }
            }
        }
    },
    computed: {
        /**
         * Shorthand for image resource id
         */
        id () {
            return this.resource.id
        },
        isSelectedAnnotation () {
            if (!this.annotationMenu) {
                return false
            }
            const refs = this.resource.referenceAnnotations // Stupid trick to avoid TS error
            if (!this.resource.referenceAnnotations[this.annotationMenu.type as keyof typeof refs].length ||
                this.resource.referenceAnnotations[this.annotationMenu.type as keyof typeof refs].indexOf(this.annotationMenu.data) === -1
            ) {
                return false
            }
            return true
        },
    },
    methods: {
        /** Shorthand for component-specific translations */
        t: function (str: string, args?: any) {
            if (args) {
                return this.$t(`components.Radiology.Dicom.DicomImageDisplay.${str}`, args)
            } else {
                return (this.$t('components.Radiology.Dicom.DicomImageDisplay') as any)[str]
            }
        },
        /**
         * Adjust image levels (window width and center) by given values.
         * @param {number} x amount to adjust window width.
         * @param {number} y amount to adjust window center.
         */
        adjustLevels: function (x: number, y: number) {
            this.resource.viewport.voi.windowWidth += (x / this.resource.viewport.scale)
            this.resource.viewport.voi.windowCenter += (y / this.resource.viewport.scale)
            cornerstone.setViewport(this.dicomEl, this.resource.viewport)
        },
        /**
         * Display the single image from this.resource or current image (this.resource.currentPosition) from image stack.
         * @param {boolean} defaultVP use the default viewport settings (resetting any modifications).
         */
        displayImage: async function (defaultVP: boolean = false, stackPos?: number): Promise<void|object> {
            const imageUrl = this.resource.currentImage.url
            return await cornerstone.loadImage(imageUrl).then((image: any) => {
                if (defaultVP || !this.resource.viewport) {
                    // Set viewport to default settings
                    this.resource.viewport = cornerstone.getDefaultViewportForImage(this.dicomEl, image)
                    if (this.viewportProps) {
                        this.resource.viewport = Object.assign({...this.resource.viewport}, {...this.viewportProps})
                        this.viewportProps = null
                    }
                    // Resize the image to align and display topogram
                    this.resizeImage()
                }
                if (this.resource.viewport) {
                    cornerstone.displayImage(this.dicomEl, image, this.resource.viewport)
                }
            })
        },
        flipHorizontally: function () {
            if (this.dicomEl && this.resource.viewport) {
                this.resource.viewport.hflip = !this.resource.viewport.hflip
                this.displayImage()
                this.updateOrientationMarkers()
            }
        },
        flipVertically: function () {
            if (this.dicomEl && this.resource.viewport) {
                this.resource.viewport.vflip = !this.resource.viewport.vflip
                this.displayImage()
                this.updateOrientationMarkers()
            }
        },
        getAnnotationAngleBetween: function (ref: any, act: any) {
            // Calculate active line angle to x-axis
            const actX = act.handles.end.x - act.handles.start.x
            const actY = act.handles.end.y - act.handles.start.y
            const actAng = actY !== 0 || actX > 0 ? 2*Math.atan(actY/(actX + Math.sqrt(actX**2 + actY**2)))*180/Math.PI
                           : actX === 0 ? 0 : 180 // Special cases
            // Calculate reference line angle to x-axis
            const refX = ref.handles.end.x - ref.handles.start.x
            const refY = ref.handles.end.y - ref.handles.start.y
            const refAng = refY !== 0 || refX > 0 ? 2*Math.atan(refY/(refX + Math.sqrt(refX**2 + refY**2)))*180/Math.PI
                           : refX === 0 ? 0 : 180
            const angBtwn = (actAng - refAng + 360)%360
            const angMinMax = [angBtwn%180, 180 - angBtwn%180]
            return (Math.min(...angMinMax)).toFixed(1) + '° / ' + (Math.max(...angMinMax)).toFixed(1) + '°';
        },
        getAnnotationLengthDiff: function (ref: any, act: any) {
            if (act.unit !== ref.unit) {
                return '???'
            }
            const lenDiff = Math.abs(act.length - ref.length)
            const diffSign = ref.length > act.length ? '-' : '+'
            return `${diffSign}${lenDiff.toFixed(1)}${act.unit} (${diffSign}${(lenDiff/ref.length*100).toFixed(1)}%)`
        },
        getAnnotationMenuStyles () {
            if (!this.annotationMenu) {
                return 'display: none'
            } else {
                const offset = cornerstone.pageToPixel(this.dicomEl, 0, 0)
                const osLeft = this.dicomEl.getBoundingClientRect().left
                const osTop = this.dicomEl.getBoundingClientRect().top
                const top = (this.annotationMenu.anchor.y - offset.y)*this.resource.viewport.scale - osTop + 20
                const left = (this.annotationMenu.anchor.x - offset.x)*this.resource.viewport.scale - osLeft + 20
                return `top: ${top}px; left: ${left}px`
            }
        },
        getNextFreeReferenceNum () {
            if (!this.annotationMenu) {
                return 0
            }
            const refs = this.resource.referenceAnnotations
            return this.resource.referenceAnnotations[this.annotationMenu.type as keyof typeof refs].length + 1
        },
        getReferenceAnnotations () {
            if (!this.annotationMenu) {
                return []
            }
            const refs = this.resource.referenceAnnotations
            const valid = []
            for (const anno of this.resource.referenceAnnotations[this.annotationMenu.type as keyof typeof refs]) {
                // Note! This method must return the same amount of elements as there are annotations, otherwise
                // annotation numbering will be off
                if (anno !== this.annotationMenu.data) {
                    valid.push(anno)
                } else {
                    valid.push(null)
                }
            }
            return valid
        },
        getReferenceNumber () {
            if (!this.annotationMenu) {
                return 0
            }
            const refs = this.resource.referenceAnnotations
            return this.resource.referenceAnnotations[this.annotationMenu.type as keyof typeof refs].indexOf(this.annotationMenu.data) + 1
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
            e.event.preventDefault()
            //const getHandleNearImagePoint = cornerstoneTools.importInternal('manipulators/getHandleNearImagePoint')
            const toolStates = cornerstoneTools.globalImageIdSpecificToolStateManager.saveToolState()
            // Get tool state for currently displayed image
            const localState = toolStates[this.resource.currentImage.url]
            // Clicked image coordinates
            const coords = {...e.lastPoints.image}
            if (localState) {
                const annoTypes = {
                    //ang: `Angle-${this.$store.state.appName}`,
                    len: `Length-${this.$store.state.appName}`,
                    roiE: `EllipticalRoi-${this.$store.state.appName}`,
                }
                // Remove annotation method
                const removeAnnotation = (type: string, index: number) => {
                    const anno = localState[annoTypes[type as keyof typeof annoTypes]].data[index]
                    const annoIdx = this.resource.referenceAnnotations[type as keyof typeof annoTypes].indexOf(anno)
                    if (annoIdx !== -1) {
                        this.resource.referenceAnnotations[type as keyof typeof annoTypes].splice(annoIdx, 1)
                    }
                    localState[annoTypes[type as keyof typeof annoTypes]].data.splice(index, 1)
                    cornerstoneTools.globalImageIdSpecificToolStateManager.restoreToolState(toolStates)
                    cornerstone.updateImage(this.dicomEl, false)
                    this.annotationMenu = null
                }
                // Select annotation method
                const selectAnnotation = (type: string, index: number) => {
                    if (type === 'roi') {
                        const anno = localState[`EllipticalRoi-${this.$store.state.appName}`].data[index]
                        if (this.resource.referenceAnnotations.roiE.indexOf(anno) === -1) {
                            this.resource.referenceAnnotations.roiE.push(anno)
                        }
                    } else if (type === 'len') {
                        const anno = localState[`Length-${this.$store.state.appName}`].data[index]
                        if (this.resource.referenceAnnotations.len.indexOf(anno) === -1) {
                            this.resource.referenceAnnotations.len.push(anno)
                        }
                    }
                }
                // Check if there are any angles, RoIs or lengths on the active image
                for (const [key, index] of Object.entries(annoTypes)) {
                    if (localState[index]) {
                        for (let i=0; i<localState[index].data.length; i++) {
                            const anno = localState[index].data[i]
                            const threshold = CLICK_DISTANCE_THRESHOLD/this.resource.viewport.scale // Take scale into account
                            if (cornerstoneMath.point.distance(anno.handles.start, coords) <= threshold ||
                                cornerstoneMath.point.distance(anno.handles.end, coords) <= threshold
                            ) {
                                this.annotationMenu = {
                                    anchor: cornerstoneMath.point.distance(anno.handles.start, coords) <= threshold
                                            ? anno.handles.start : anno.handles.end,
                                    data: anno,
                                    remove: () => {
                                        removeAnnotation(key, i)
                                    },
                                    select: () => {
                                        selectAnnotation(key, i)
                                    },
                                    type: key,
                                    unselect: () => {
                                        const annoIdx = this.resource.referenceAnnotations[key as keyof typeof annoTypes].indexOf(anno)
                                        if (annoIdx !== -1) {
                                            this.resource.referenceAnnotations[key as keyof typeof annoTypes].splice(annoIdx, 1)
                                        }
                                    },
                                }
                                return
                            }
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
         * Invert the image colors values.
         */
        invertImage: function () {
            this.resource.viewport.invert = !this.resource.viewport.invert
            this.displayImage()
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
         * Mouse has left the image area.
         */
        mouseLeftImageArea: function () {
            this.hideAnnotationMenu()
            // Re-enable currently active tool (this is not really needed for all tools)
            this.$store.dispatch('tools:re-enable-active')
        },
        /**
         * Pan image by given coordinates.
         * @param {number} x distance on the x-axis.
         * @param {number} y distance on the y-axis.
         */
        panImage: function (x: number, y: number) {
            this.resource.viewport.translation.x -= (x / this.resource.viewport.scale)
            this.resource.viewport.translation.y -= (y / this.resource.viewport.scale)
            cornerstone.setViewport(this.dicomEl, this.resource.viewport)
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
        resizeImage: function (first = false) {
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
                = isRowFirst? 'none' : '1px solid var(--medimg-viewer-border-faint)'
            this.dicomWrapper.style.borderBottom
                = isColLast ? 'none' : '1px solid var(--medimg-viewer-border-faint)'
            // Resize image if it is done loading
            if (this.mainImageLoaded) {
                if (first) {
                    this.viewportProps = this.resource.viewport ?
                        {
                            hflip: this.resource.viewport.hflip,
                            vflip: this.resource.viewport.vflip,
                            invert: this.resource.viewport.invert,
                            translation: {...this.resource.viewport.translation},
                            rotation: this.resource.viewport.rotation,
                            voi: {...this.resource.viewport.voi},
                            voiLUT: this.resource.viewport.voiLUT
                        } : null
                    this.resource.viewport = cornerstone.getViewport(this.dicomEl)
                }
                cornerstone.resize(this.dicomEl, false)
            } else {
                // Update the loading text position
                const loadingText = (document.querySelector(
                        `#container-${this.id}-${this.instanceNum} > .medimg-viewer-image-loading`
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
            if (this.dicomEl && this.resource.viewport) {
                this.resource.viewport.rotation += angle
                this.displayImage()
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
                    await this.displayImage()
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
                                    this.resource.isStack
                                    ? this.resource.currentImage.url
                                    : this.resource.url
                                ) as any
            if (!imagePlane || !imagePlane.rowCosines || !imagePlane.columnCosines) {
                return
            }
            const rowVec3 = convertToVector3(imagePlane.rowCosines)
            const rowAbs = new cornerstoneMath.Vector3(
                Math.abs(rowVec3.x), Math.abs(rowVec3.y), Math.abs(rowVec3.z)
            )
            const ds = [this.t('orientation_right'), this.t('orientation_left')]
            const ap = [this.t('orientation_anterior'), this.t('orientation_posterior')]
            const cc = [this.t('orientation_cranial'), this.t('orientation_caudal')]
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
            if (this.resource.viewport) {
                if (this.resource.viewport.hflip) {
                    [markers.left, markers.right] = [markers.right, markers.left]
                }
                if (this.resource.viewport.vflip) {
                    [markers.top, markers.bottom] = [markers.bottom, markers.top]
                }
                if (this.resource.viewport.rotation > 45) {
                    for (let i=this.resource.viewport.rotation; i>45; i=i-90) {
                        // Rotate markers 90 degrees at a time
                        [markers.top, markers.right, markers.bottom, markers.left]
                            = [markers.left, markers.top, markers.right, markers.bottom]
                    }
                } else if (this.resource.viewport.rotation < -45) {
                    for (let i=this.resource.viewport.rotation; i<-45; i=i+90) {
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
            this.resource.viewport.scale *= 1 + z*0.01
            cornerstone.setViewport(this.dicomEl, this.resource.viewport)
        }
    },
    mounted () {
        this.dicomWrapper = this.$refs[`wrapper`] as HTMLDivElement
        this.dicomEl = this.$refs[`container`] as HTMLDivElement
        this.topoEl = this.$refs[`topogram`] as HTMLDivElement
        if (!this.dicomEl) {
            // This obviously should not happen, but let's humor Typescript
            return
        }
        // Trigger first component resize to show the borders and loading text
        this.resizeImage()
        // Add event listener
        this.dicomEl.addEventListener('cornerstonetoolsmouseclick', (e: any) => {
            if (e.detail.event.button === 2) {
                // Right mouse click
                this.handleRightClick(e.detail)
            } else if (!e.detail.event.button && this.annotationMenu) {
                // Hide annotation menu on left mouse click.
                // This doesn't seem to stop an active tool from triggering a click event, unfortunately.
                // One solution would be to insert an overlay on top of the image element to catch
                // clicks when the annotation menu is open. Something to consider in the future...
                e.detail.event.preventDefault()
                e.detail.event.stopPropagation()
                this.annotationMenu = null
            }
        }, true)
        this.dicomEl.addEventListener('cornerstonetoolsmousedoubleclick', (e: any) => {
            // For mobile compatibility, handle double click as right mouse click
            this.handleRightClick(e.detail)
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
            //        `#container-${this.id}-${this.instanceNum} > .medimg-viewer-image-loading`
            //    ) as HTMLDivElement).innerText = this.$t('ERROR').toString()
            console.error(reason)
            this.$emit('done-loading')
        }
        // Enable the element
        try {
            cornerstone.enable(this.dicomEl)
        } catch (e) {
            // This is a very stange error.
            // It turns up rarely and I have only ever seen it in the preset layout view, making me think
            // it is some weird race-condition bug. It may have to do with cornerstone not being able to
            // remove some event listener when a tool is in use, but until I'm sure this has been eliminated
            // I will keep this here.
            this.$emit('enable-element-error')
            this.$emit('done-loading')
            return
        }
        // Save viewport
        // Conerstone tool options
        const zoomOpts = {
            name: `Zoom-${this.$store.state.appName}`,
            configuration: {
                invert: true,
                preventZoomOutsideImage: false,
                minScale: .1,
                maxScale: 20.0,
            }
        }
        // Set up basic tools
        cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.EllipticalRoiTool,
            { name: `EllipticalRoi-${this.$store.state.appName}` },
        )
        cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.LengthTool,
            { name: `Length-${this.$store.state.appName}` },
        )
        cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.PanTool,
            { name: `Pan-${this.$store.state.appName}` },
        )
        cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.WwwcTool,
            { name: `Wwwc-${this.$store.state.appName}` },
        )
        cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.ZoomTool, zoomOpts)
        // Restore possible cached tool states.
        // We need to set annotation tools active for the duration of image rendering, or the
        // annotation will not be displayd.
        cornerstoneTools.setToolActive(`EllipticalRoi-${this.$store.state.appName}`, { })
        cornerstoneTools.setToolActive(`Length-${this.$store.state.appName}`, { })
        const toolStates = cornerstoneTools.globalImageIdSpecificToolStateManager.saveToolState()
        // Sort the images if the resource is an image stack
        if (this.resource.isStack) {
            // Add stack state manager to loaded images
            this.resource.preloadAndSortImages().then((response: { success: boolean, reason?: any }) => {
                // Check that dicomEl still exists, in case the container has been destroyed during the load
                if (response.success && !this.destroyed) {
                    // Fetch possible cached tool states
                    for (const img of this.resource.images) {
                        if (img.toolState) {
                            // Move tool state to cornerstone tool state manager and reset cache
                            toolStates[img.url] = {...img.toolState}
                            img.toolState = null
                        }
                    }
                }
                // Stop loading dot cycler
                window.clearInterval(this.loadingDotCycle)
                this.mainImageLoaded = true
                // Set up cornerstone stack scroll tool
                const imageIds = this.resource.images.map((img: DicomImage) => img.url)
                const stackOpts = {
                    currentImageIdIndex: this.resource.currentPosition,
                    imageIds
                }
                cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.CrosshairsTool,
                    { name: `Crosshairs-${this.$store.state.appName}` },
                )
                this.synchronizers.crosshairs.add(this.dicomEl)
                cornerstoneTools.addStackStateManager(this.dicomEl, ['stack', 'Crosshairs'])
                cornerstoneTools.addToolState(this.dicomEl, 'stack', stackOpts)
                cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.StackScrollTool,
                    { name: `StackScroll-${this.$store.state.appName}` }
                )
                cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.StackScrollMouseWheelTool,
                    { name: `StackScrollMouseWheel-${this.$store.state.appName}` }
                )
                // Register element to synchronizers
                this.synchronizers.stackScroll.add(this.dicomEl)
                this.resource.currentPosition = this.resource.currentPosition
                const displayMainImage = () => {
                    // Shorthand for these operations, as they are needed in a few (async) paths.
                    // Don't trigger resize if the container has been destroyed
                    if (!this.destroyed) {
                        this.resizeImage(true)
                    }
                    this.displayImage().then(() => {
                        this.$emit('done-loading')
                        this.$nextTick(() => {
                            // Set annotation tools passive before re-enabling the active tools.
                            cornerstoneTools.setToolPassive(`EllipticalRoi-${this.$store.state.appName}`)
                            cornerstoneTools.setToolPassive(`Length-${this.$store.state.appName}`)
                            this.$store.dispatch('tools:re-enable-active')
                        })
                    })
                }
                // Display possible topogram
                if (this.resource.topogram !== null) {
                    try {
                        cornerstone.enable(this.topoEl)
                    } catch (e) {
                        this.$emit('enable-element-error')
                        return
                    }
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
            }).catch((reason: any) => {
                showLoadingError(reason)
            })
        } else {
            // Restore possible image tool state and reset cache value
            if (this.resource.toolState) {
                toolStates[this.resource.url] = {...this.resource.toolState}
                this.resource.toolState = null
            }
            // Display first image with default settings
            this.displayImage().then(image => {
                window.clearInterval(this.loadingDotCycle)
                this.resource.readMetadataFromImage(image)
                this.mainImageLoaded = true
                // Set annotation tools passive and re-enable the active tool to include this image
                cornerstoneTools.setToolPassive(`EllipticalRoi-${this.$store.state.appName}`)
                cornerstoneTools.setToolPassive(`Length-${this.$store.state.appName}`)
                this.$store.dispatch('tools:re-enable-active')
                this.isFirstLoaded = true
                this.resizeImage()
            }).catch((reason: any) => {
                showLoadingError(reason)
            })
        }
        cornerstoneTools.globalImageIdSpecificToolStateManager.restoreToolState(toolStates)
        // Subscribe to store dispatch events
        this.unsubscribeActions = this.$store.subscribeAction((action) => {
            switch (action.type) {
                case 'image:flip-horizontally':
                    this.flipHorizontally()
                    break
                case 'image:flip-vertically':
                    this.flipVertically()
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
        // Save possible tool state
        const toolStates = cornerstoneTools.globalImageIdSpecificToolStateManager.saveToolState()
        if (this.resource.isStack) {
            // Get tool state for currently displayed image
            for (const img of this.resource.images) {
                if (toolStates[img.url]) {
                    img.toolState = toolStates[img.url]
                }
            }
        } else if (toolStates[this.resource.url]) {
            this.resource.toolState = toolStates[this.resource.url]
        }
        // Remove tools
        if (this.mainImageLoaded) {
            try {
                // If the component is destroyed before all of the setup is done, some of these may throw errors
                cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.EllipticalRoiTool)
                cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.LengthTool)
                cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.PanTool)
                cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.WwwcTool)
                cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.ZoomTool)
                if (this.resource.isStack) {
                    // Remove stack-specific tools
                    cornerstoneTools.clearToolState(this.dicomEl, 'stack')
                    cornerstoneTools.clearToolState(this.dicomEl, 'Crosshairs')
                    cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.CrosshairsTool)
                    cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.StackScrollTool)
                    cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.StackScrollMouseWheelTool)
                    // Unregister synchronizers
                    this.synchronizers.stackScroll.remove(this.dicomEl)
                }
            } catch (e) {}
        }
        // Disable the element
        try {
            // This can error if the enable-element errored...
            cornerstone.disable(this.dicomEl)
        } catch (e) {
        }
        if (this.resource.topogram && this.topoImageLoaded) {
            try {
                // Same for topogram
                cornerstoneTools.setToolDisabled(`TopogramReferenceLines-${this.instanceNum}`)
                cornerstoneTools.removeToolForElement(this.topoEl, TopogramReferenceLineTool)
                cornerstone.disable(this.topoEl)
            } catch (e) {}
        }
        // Unsubscribe from store
        if (this.unsubscribeActions !== null) {
            this.unsubscribeActions()
        }
        if (this.unsubscribeMutations !== null) {
            this.unsubscribeMutations()
        }
    },
})

</script>

<style scoped>
.medimg-viewer-image-wrapper {
    position: relative;
    float: left;
    padding: 10px;
}
    .medimg-viewer-image-wrapper > .medimg-viewer-annotation-menu {
        position: absolute;
        display: inline-block;
        border: 2px solid var(--medimg-viewer-border);
        background-color: var(--medimg-viewer-background);
        cursor: pointer;
        z-index: 2;
    }
        .medimg-viewer-image-wrapper > .medimg-viewer-annotation-menu > div {
            line-height: 30px;
            padding: 0 10px;
        }
        .medimg-viewer-image-wrapper .medimg-viewer-annotation-action {
            color: var(--medimg-viewer-text-highlight);
        }
        .medimg-viewer-image-wrapper .medimg-viewer-annotation-action:hover {
            background-color: var(--medimg-viewer-background-emphasize);
        }
        .medimg-viewer-image-wrapper .medimg-viewer-annotation-compare-row {
            width: 200px;
            opacity: 0.9;
            font-size: 90%;
        }
            .medimg-viewer-image-wrapper .medimg-viewer-annotation-compare-row > span:nth-child(2) {
                float: right;
            }
    .medimg-viewer-image-wrapper > .medimg-viewer-orientation-marker {
        position: absolute;
        display: inline-block;
        width: 40px;
        height: 40px;
        line-height: 40px;
        text-align: center;
        z-index: 1; /* Below delete button toolbar button groups */
        pointer-events: none;
    }
        .medimg-viewer-image-wrapper > .medimg-viewer-orientation-marker-bottom {
            bottom: 0;
        }
        .medimg-viewer-image-wrapper > .medimg-viewer-orientation-marker-left {
            left: 0;
        }
        .medimg-viewer-image-wrapper > .medimg-viewer-orientation-marker-right {
            right: 0;
        }
        .medimg-viewer-image-wrapper > .medimg-viewer-orientation-marker-top {
            top: 0;
        }
    .medimg-viewer-image-loading-progress {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 10px;
        border-bottom: solid 1px var(--medimg-viewer-border-faint);
    }
        .medimg-viewer-image-loading-progress > div {
            width: 0px;
            height: 9px;
            background-color: var(--medimg-viewer-background-emphasize);
        }
    .medimg-viewer-image-wrapper > .medimg-viewer-tool-icons {
        position: absolute;
        top: 40px;
        right: 10px;
        font-size: 20px;
        color: var(--medimg-viewer-text-faint);
    }
        .medimg-viewer-image-wrapper > .medimg-viewer-tool-icons > svg {
            cursor: pointer;
        }
        .medimg-viewer-image-wrapper > .medimg-viewer-link-icon-active {
            color: var(--medimg-viewer-text-main);
        }
    .medimg-viewer-image-wrapper > .medimg-viewer-meta-topleft {
        position: absolute;
        left: 10px;
        top: 10px;
        display: flex;
        flex-direction: column;
        line-height: 20px;
        pointer-events: none;
    }
    .medimg-viewer-image-wrapper > .medimg-viewer-meta-topright {
        position: absolute;
        right: 10px;
        top: 10px;
        display: flex;
        flex-direction: column;
        line-height: 20px;
        text-align: right;
        pointer-events: none;
    }
    .medimg-viewer-image-wrapper > .medimg-viewer-meta-bottomleft {
        position: absolute;
        left: 10px;
        bottom: 10px;
        display: flex;
        flex-direction: column-reverse;
        line-height: 20px;
        pointer-events: none;
    }
    .medimg-viewer-image-wrapper > .medimg-viewer-meta-bottomright {
        position: absolute;
        right: 10px;
        bottom: 10px;
        display: flex;
        flex-direction: column-reverse;
        text-align: right;
        height: calc(100% - 10px);
        line-height: 20px;
        pointer-events: none;
    }
    .medimg-viewer-meta-bottomright > .medimg-viewer-topogram {
        position: relative;
        right: -11px; /* cover the default image border */
        bottom: -11px;
        height: 20%;
        pointer-events: none;
        border: solid 1px var(--medimg-viewer-border-faint);
        background-color: var(--medimg-viewer-background);
        transform-origin: bottom right;
    }
        .medimg-viewer-image-container > div {
            font-size: 24px;
            font-family: sans-serif;
            font-weight: bold;
            font-style: italic;
            color: var(--medimg-viewer-text-faint);
            text-align: center;
        }
        .medimg-viewer-image-disabled {
            pointer-events: none;
        }
</style>
