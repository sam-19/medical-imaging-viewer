<template>

    <div ref="wrapper" class="medigi-viewer-image-wrapper">
        <div ref="container" :id="`container-${id}-${instanceNum}`"
            oncontextmenu="return false // Prevent context menu pop-up on right click"
        ></div>
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
        <div v-if="topogram && resource.isStack" ref="topogram" :id="`topogram-${id}-${instanceNum}`"
            class="medigi-viewer-topogram"
            oncontextmenu="return false // Prevent context menu pop-up on right click"
        >
        </div>
    </div>

</template>

<script lang="ts">
import Vue from 'vue'
import cornerstoneTools from 'cornerstone-tools'
import DICOMDataProperty from '../assets/dicom/DICOMDataProperty'
import DICOMImage from '../assets/dicom/DICOMImage'
import { MOUSE_BUTTON } from '../types/viewer'
import { ImageResource, ImageStackResource } from '../types/assets'

let INSTANCE_NUM = 0

export default Vue.extend({
    components: {
    },
    props: {
        containerSize: Array, // The size of the entire image media container as [width, height]
        layoutPosition: Array, // Element position in layout grid [[colPos, cols], [rowPos, rows]]
        linkedStackPos: Number, // Linked stack position
        resource: Object, // DICOMResource or DICOMImageStack
        topogram: Object, // DICOMImage
    },
    data () {
        return {
            dicomWrapper: null as unknown as HTMLDivElement, // DICOM image wrapper
            dicomEl: null as unknown as HTMLDivElement, // DICOM image element
            topoEl: null as unknown as HTMLDivElement, // Topogram element
            isFirstLoaded: false, // At least one image is loaded
            isLinked: false, // Whether this image is linked or not
            lastMousePos: [0, 0], // Last mouse position on the screen
            linkedPos: null as number | null, // Position where this stack was linked
            masterLinkPos: null as number | null, // Global "master" linked position
            mouseLBtnDown: false, // Is the left mouse button down (depressed)
            mouseMBtnDown: false, // Is the middle mouse button down (depressed)
            mouseRBtnDown: false, // Is the right mouse button down (depressed)
            scrollProgress: 0, // Progress towards a scroll step
            viewport: null as any, // Save viewport settings for image stacks
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
            this.resizeImage(value)
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
            this.$root.cornerstone.setViewport(this.dicomEl, this.viewport)
        },
        /**
         * Display the single image from this.resource or current image (this.resource.currentPosition) from image stack.
         * @param {boolean} defaultVP use the default viewport settings (resetting any modifications).
         */
        displayImage: async function (defaultVP: boolean, stackPos?: number): Promise<boolean> {
            const imageUrl = this.resource.isStack
                             ? this.resource.images[this.resource.currentPosition].url
                             : this.resource.url
            return await this.$root.cornerstone.loadImage(imageUrl).then((image: any) => {
                if (defaultVP) {
                    // Set this.viewport to default settings
                    this.viewport = this.$root.cornerstone.getDefaultViewportForImage(this.dicomEl, image)
                }
                if (this.viewport) {
                    this.$root.cornerstone.displayImage(this.dicomEl, image, this.viewport)
                }
                return true
            }).catch(() => {
                // TODO: Display error image
                return false
            })
        },
        flipHorizontally: function () {
            if (this.dicomEl && this.viewport) {
                this.viewport.hflip = !this.viewport.hflip
                this.displayImage(false)
            }
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
            this.$root.cornerstone.setViewport(this.dicomEl, this.viewport)
        },
        /**
         * Reset the viewport to default state.
         */
        resetViewport: function () {
            this.displayImage(true)
        },
        /**
         * Resize the displayed image into given dimensions.
         * @param {number[]} dimensions [width, height].
         */
        resizeImage: function (dimensions?: number[]) {
            if (!this.dicomEl || !this.dicomWrapper) {
                return
            }
            dimensions = dimensions || this.containerSize as number[]
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
            this.$root.cornerstone.resize(this.dicomEl, false)
            // Store the resized viewport (or it will reset to initial config when the stack is scrolled)
            this.viewport = this.$root.cornerstone.getViewport(this.dicomEl)
            //this.$root.cornerstone.setViewport(this.dicomEl, this.viewport)
            // Resize possible topogram image
            if (this.topogram) {
                this.topoEl.style.width = `${(dimensions[0]/colPos[1] - hPad)*0.25}px`
                this.topoEl.style.height = `${(dimensions[1]/rowPos[1] - vPad)*0.25}px`
                this.$root.cornerstone.resize(this.topoEl, false)
            }
        },
        rotateBy: function (angle: number) {
            if (this.dicomEl && this.viewport) {
                this.viewport.rotation += angle
                this.displayImage(false)
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
         * Unlink this image stack.
        unlinkImageStack: function () {
            this.linkedOffset = null
        },
         */
        /**
         * Zoom in our out of the displayed image.
         * @param {number} z zoom amount in percents.
         */
        zoomImage: function (z: number) {
            this.viewport.scale *= 1 + z*0.01
            this.$root.cornerstone.setViewport(this.dicomEl, this.viewport)
        }
    },
    mounted () {
        this.dicomWrapper = this.$refs[`wrapper`] as HTMLDivElement
        this.dicomEl = this.$refs[`container`] as HTMLDivElement
        this.topoEl = this.$refs[`topogram`] as HTMLDivElement
        if (this.dicomEl) {
            // Enable the element
            this.$root.cornerstone.enable(this.dicomEl)
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
            this.viewport = this.$root.cornerstone.getViewport(this.dicomEl)
            // Conerstone tool options
            const zoomOpts = {
                configuration: {
                    invert: true,
                    preventZoomOutsideImage: false,
                    minScale: .1,
                    maxScale: 20.0,
                }
            }
            // Sort the images if the resource is an image stack
            if (this.resource.isStack) {
                // Add stack state manager to loaded images
                this.resource.preloadAndSortImages().then((success: boolean) => {
                    if (success) {
                        // Set up pan tool
                        cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.PanTool)
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
                        // Set up wwwc tool
                        cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.WwwcTool)
                        // Set up zoom tool
                        cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.ZoomTool, zoomOpts)
                        // Register element to synchronizers
                        this.$root.synchronizers.stackScroll.add(this.dicomEl)
                        this.$root.synchronizers.referenceLines.add(this.dicomEl)
                        // Add reference lines tool (must be done after setting up synchronizers!)
                        //cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.ReferenceLinesTool)
                        this.resource.currentPosition = this.resource.currentPosition
                        const enableElement = () => {
                            // Shorthand for these operations, as there are needed in a few (async) paths
                            this.$store.dispatch('tools:re-enable-active')
                            this.displayImage(true)
                            Vue.nextTick(() => {
                                this.resizeImage(this.containerSize as number[])
                            })
                        }
                        // Display possible topogram
                        if (this.topogram) {
                            this.$root.cornerstone.enable(this.topoEl)
                            this.$root.cornerstone.loadImage(this.topogram.url).then((image: any) => {
                                const vp = this.$root.cornerstone.getDefaultViewportForImage(this.topoEl, image)
                                // We need to pass stack tools even to single images to enable reference lines
                                const stackOpts = {
                                    currentImageIdIndex: 0,
                                    imageIds: [this.resource.url]
                                }
                                cornerstoneTools.addStackStateManager(this.topoEl, ['stack', 'Crosshairs'])
                                cornerstoneTools.addToolState(this.topoEl, 'stack', stackOpts)
                                // Register element to synchronizers
                                this.$root.synchronizers.referenceLines.add(this.topoEl)
                                // Add reference lines tool (must be done after setting up synchronizers!)
                                cornerstoneTools.addToolForElement(this.topoEl, cornerstoneTools.ReferenceLinesTool)
                                this.$root.cornerstone.displayImage(this.topoEl, image, vp)
                                // Activate reference lines tool
                                cornerstoneTools.setToolEnabled('ReferenceLines', {
                                    synchronizationContext: this.$root.synchronizers.referenceLines,
                                })
                                enableElement()
                            }).catch((e: any) => {
                                console.error('Loading topogram failed!')
                                enableElement()
                            })
                        } else {
                            enableElement()
                        }
                    }
                    this.$store.commit('set-cache-status', this.$root.cornerstone.imageCache.getCacheInfo())
                    this.isFirstLoaded = true
                    // Save new position
                    this.dicomEl.addEventListener('cornerstonenewimage', (e: any) => {
                        this.resource.setCurrentPositionByUrl(e.detail.image.imageId)
                    })
                })
            } else {
                // Display first image with default settings
                this.displayImage(true).then((success: boolean) => {
                    if (success) {
                        // We need to pass stack tools even to single images to enable reference lines
                        //const stackOpts = {
                        //    currentImageIdIndex: 0,
                        //    imageIds: [this.resource.url]
                        //}
                        //cornerstoneTools.addStackStateManager(this.dicomEl, ['stack', 'Crosshairs'])
                        //cornerstoneTools.addToolState(this.dicomEl, 'stack', stackOpts)
                        // Set up wwwc tool
                        cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.WwwcTool)
                        // Set up zoom tool
                        cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.ZoomTool, zoomOpts)
                        // Register element to synchronizers
                        //this.$root.synchronizers.stackScroll.add(this.dicomEl)
                        //this.$root.synchronizers.referenceLines.add(this.dicomEl)
                        // Add reference lines tool (must be done after setting up synchronizers!)
                        //cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.ReferenceLinesTool)
                        // Re-enable the active tool to include this image
                        this.$store.dispatch('tools:re-enable-active')
                    }
                    this.isFirstLoaded = true
                    Vue.nextTick(() => {
                        this.resizeImage(this.containerSize as number[])
                    })
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
        if (this.isLinked) {
            // Break linking
            this.isLinked = false
            this.linkedPos = null
            this.$store.commit('remove-linked-item', this.id)
        }
        // Remove pan tool
        cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.PanTool)
        // Remove wwwc tool
        cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.WwwcTool)
        // Remove zoom tool
        cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.ZoomTool)
        // Remove stack scroll tool
        cornerstoneTools.clearToolState(this.dicomEl, 'stack')
        cornerstoneTools.clearToolState(this.dicomEl, 'Crosshairs')
        // Remove stack scroll tool
        cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.StackScrollTool)
        cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.StackScrollMouseWheelTool)
        // Remove reference lines tool
        cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.ReferenceLinesTool)
        // Unregister synchronizers
        this.$root.synchronizers.stackScroll.remove(this.dicomEl)
        this.$root.synchronizers.referenceLines.remove(this.dicomEl)
        // Disable the element
        this.$root.cornerstone.disable(this.dicomEl)
        if (this.topogram) {
            // Same for topogram
            cornerstoneTools.clearToolState(this.topoEl, 'stack')
            cornerstoneTools.clearToolState(this.topoEl, 'Crosshairs')
            cornerstoneTools.removeToolForElement(this.topoEl, cornerstoneTools.ReferenceLinesTool)
            this.$root.synchronizers.stackScroll.remove(this.topoEl)
            this.$root.synchronizers.referenceLines.remove(this.topoEl)
            this.$root.cornerstone.disable(this.topoEl)
        }
        // Ubsubscribe from store
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
        right: 0px;
        bottom: 0px;
        height: 20%;
        pointer-events: none;
        background-color: #CCCCCC;
    }
</style>
