<template>

    <div :ref="`wrapper-${resource.id}`" class="medigi-viewer-image-wrapper">
        <div :ref="`container-${resource.id}`" :id="`container-${resource.id}`"
            oncontextmenu="return false // Prevent context menu pop-up on right click"
        ></div>
        <font-awesome-icon v-if="resource.isStack && isFirstLoaded"
            :icon="isLinked ? ['fal', 'unlink'] : ['fal', 'link']"
            :title="$t('Link this image stack')"
            @click="isLinked = !isLinked"
            :class="{ 'medigi-viewer-link-icon-active' : isLinked }"
            class="medigi-viewer-link-icon"
            fixed-width
        />
        <span v-if="resource.isStack && isFirstLoaded"
            class="medigi-viewer-stack-position"
        >{{ this.resource.lastPosition + 1 }}/{{ this.resource.images.length }}</span>
    </div>

</template>

<script lang="ts">
import Vue from 'vue'
import cornerstoneTools from 'cornerstone-tools'
import DICOMDataProperty from '../assets/dicom/DICOMDataProperty'
import DICOMImage from '../assets/dicom/DICOMImage'
import { MOUSE_BUTTON } from '../types/viewer'
import { ImageResource, ImageStackResource } from '../types/assets'

export default Vue.extend({
    components: {
    },
    props: {
        containerSize: Array, // The size of the entire image media container as [width, height]
        linkedStackPos: Number, // Linked stack position
        listPosition: Number, // Position of this image in the image list as [index, list length]
        resource: Object, // DICOMResource or DICOMImageStack
    },
    data () {
        return {
            dicomWrapper: null as unknown as HTMLDivElement, // DICOM image wrapper
            dicomEl: null as unknown as HTMLDivElement, // DICOM image element
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
        }
    },
    watch: {
        containerSize (value: Array<number>, old: Array<number>) {
            this.resizeImage(value)
        },
        /**
         * We need to save the position where the stack is linked if we want to allow scrolling
         * relative to that starting point.
         */
        isLinked (value: boolean, old: boolean) {
            // Set linkedPos when isLinked changes
            if (value) {
                this.masterLinkPos = this.$store.state.linkedScrollPosition
                this.linkedPos = this.resource.lastPosition
                this.$store.commit('add-linked-item', this.dicomEl)
            } else {
                this.linkedPos = null
                this.$store.commit('remove-linked-item', this.dicomEl)
            }
        },
        listPosition (value: Array<number>, old: Array<number>) {
            this.resizeImage(this.containerSize as number[])
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
         * Display the single image from this.resource or current image (this.resource.lastPosition) from image stack.
         * @param {boolean} defaultVP use the default viewport settings (resetting any modifications).
         */
        displayImage: async function (defaultVP: boolean, stackPos?: number): Promise<boolean> {
            const imageUrl = this.resource.isStack
                             ? this.resource.images[this.resource.lastPosition].url
                             : this.resource.url
            this.$root.cornerstone.loadImage(imageUrl).then((image: any) => {
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
            return false
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
         */
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
        },
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
         * @param {boolean} value set this stack as linked (true) or unlinked (false)
         */
        linkImageStack: function (value: boolean) {
            if (this.resource.isStack && this.isLinked !== value) {
                // This will trigger the watcher for isLinked and emit the result to the parent
                // component, which is a little redundant if this was triggered FROM the parent,
                // but still an acceptable control method
                this.isLinked = value
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
        resizeImage: function (dimensions: number[]) {
            if (!this.dicomEl || !this.dicomWrapper) {
                return
            }
            // Remove 20 px for padding
            let hPad = 20
            let vPad = 20
            this.dicomWrapper.style.borderLeft = 'none'
            this.dicomWrapper.style.borderRight = 'none'
            this.dicomWrapper.style.borderBottom = 'none'
            if (this.$store.state.activeItems.length === 1) {
                // Only one item in the list, we can take up the whole space
                this.dicomEl.style.width = `${dimensions[0] - 20}px`
                this.dicomEl.style.height = `${dimensions[1] - 20}px`
            } else if (this.$store.state.activeItems.length === 2) {
                // Place items side by side
                // Add a left border to the second element
                if (this.listPosition) {
                    this.dicomWrapper.style.borderLeft = '1px solid var(--medigi-viewer-border-faint)'
                    hPad++ // Add border to padding
                }
                this.dicomEl.style.width = `${dimensions[0]/2 - hPad}px`
                this.dicomEl.style.height = `${dimensions[1] - vPad}px`
            } else if (this.$store.state.activeItems.length < 5) {
                // A matrix of 2x2
                // Add a left border to right side elements
                if (this.listPosition%2) {
                    this.dicomWrapper.style.borderLeft = '1px solid var(--medigi-viewer-border-faint)'
                    hPad++ // Add border to padding
                }
                // Add bottom border to top elements
                if (this.listPosition < 2) {
                    this.dicomWrapper.style.borderBottom = '1px solid var(--medigi-viewer-border-faint)'
                    vPad++
                }
                // If the bottom row is left missing one item, add right border to last element
                if (this.$store.state.activeItems.length === 3 && this.listPosition === 2) {
                    this.dicomWrapper.style.borderRight = '1px solid var(--medigi-viewer-border-faint)'
                }
                this.dicomEl.style.width = `${dimensions[0]/2 - hPad}px`
                this.dicomEl.style.height = `${dimensions[1]/2 - vPad}px`
            } else if (this.$store.state.activeItems.length < 7) {
                // A matrix of 3x2
                // Add a left border to middle and right side elements
                if (this.listPosition%3) {
                    this.dicomWrapper.style.borderLeft = '1px solid var(--medigi-viewer-border-faint)'
                    hPad++ // Add border to padding
                }
                // Add bottom border to top elements
                if (this.listPosition < 3) {
                    this.dicomWrapper.style.borderBottom = '1px solid var(--medigi-viewer-border-faint)'
                    vPad++
                }
                // If the bottom row is left missing one item, add right border to last element
                if (this.$store.state.activeItems.length === 5 && this.listPosition === 4) {
                    this.dicomWrapper.style.borderRight = '1px solid var(--medigi-viewer-border-faint)'
                }
                this.dicomEl.style.width = `${dimensions[0]/3 - hPad}px`
                this.dicomEl.style.height = `${dimensions[1]/2 - vPad}px`
            } else if (this.$store.state.activeItems.length < 10) {
                // A matrix of 3x3
                // Add a left border to middle and right side elements
                if (this.listPosition%3) {
                    this.dicomWrapper.style.borderLeft = '1px solid var(--medigi-viewer-border-faint)'
                    hPad++ // Add border to padding
                }
                // Add bottom border to top and mid row elements
                if (this.listPosition < 6) {
                    this.dicomWrapper.style.borderBottom = '1px solid var(--medigi-viewer-border-faint)'
                    vPad++
                }
                // If the bottom row is left missing the last item(s), add right border to final element
                if (this.$store.state.activeItems.length === 7 && this.listPosition === 6 ||
                    this.$store.state.activeItems.length === 8 && this.listPosition === 7
                ) {
                    this.dicomWrapper.style.borderRight = '1px solid var(--medigi-viewer-border-faint)'
                }
                this.dicomEl.style.width = `${dimensions[0]/3 - hPad}px`
                this.dicomEl.style.height = `${dimensions[1]/3 - vPad}px`
            }
            this.$root.cornerstone.resize(this.dicomEl, false)
            // Store the resized viewport (or it will reset to initial config when the stack is scrolled)
            this.viewport = this.$root.cornerstone.getViewport(this.dicomEl)
            //this.$root.cornerstone.setViewport(this.dicomEl, this.viewport)
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
            if (!this.resource.isStack || !this.isLinked || oId === this.id) {
                return
            }
            // Position must be computed relative to linking point and master linking position
            const locPos = (this.linkedPos || 0)/this.resource.images.length
                           + relPos - (this.masterLinkPos || 0)
            // Corrected local position must be between 0 and 1 (= 0 and 100% of image stack)
            if (locPos >= 0 && locPos <= 1) {
                // Check if we're already at the position.
                // This is very likely if the origin stack has more images than this stack
                // -> several origin stack images will map to the same local image
                const absPos = Math.round(locPos*this.resource.images.length)
                if (absPos !== this.resource.lastPosition) {
                    // Don't announce this position, since it was triggered by another linked stack
                    this.scrollStack(absPos, true, false)
                }

            }
            return true
        },
        /**
         * Scroll the image stack.
         * @param {number} delta positive or negative number (if absolute is false), or the absolute stack position.
         * @param {boolean} absolute use delta as absolute stack position (default false).
         * @param {boolean} announce announce new position to synchronize linked stacks (default true).
         */
        scrollStack: async function (delta: number, absolute: boolean = false, announce: boolean = true) {
            if (!this.resource.isStack) {
                return
            }
            // Don't scroll out of bounds
            if ((!absolute && this.resource.lastPosition + delta < 0) ||
                (absolute && delta < 0)
            ) {
                this.resource.lastPosition = 0
            } else if ((!absolute && this.resource.lastPosition + delta >= this.resource.images.length) ||
                       (absolute && delta >= this.resource.images.length)
            ) {
                this.resource.lastPosition = this.resource.images.length - 1
            } else if (!absolute) {
                this.resource.lastPosition += delta
            } else {
                this.resource.lastPosition = delta
            }
            this.resource.lastPosition = this.resource.lastPosition
            await this.displayImage(false)
            // Check if this stack is linked and trigger an event if it is
            if (this.isLinked && announce) {
                // Calculate current position relative to linked position, and add master link position
                const relPos = (this.resource.lastPosition - (this.linkedPos || 0))/this.resource.images.length
                               + (this.masterLinkPos || 0)
                this.$store.commit('set-linked-scroll-position', { origin: this.id, position: relPos })
            }
        },
        /**
         * Call when stack scroll tool displays a new image
         */
        stackScrolled (e: any, silent?: boolean) {
            const newStackIndex = this.resource.getIndexByUrl(e.detail.image.imageId)
            if (this.isLinked && !silent) {
                // Calculate current position relative to linked position, and add master link position
                const relPos = (this.resource.lastPosition - (this.linkedPos || 0))/this.resource.images.length
                               + (this.masterLinkPos || 0)
                this.$store.commit('set-linked-scroll-position', { origin: this.id, position: relPos })
            }
            this.resource.lastPosition = newStackIndex
        },
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
        this.dicomWrapper = this.$refs[`wrapper-${this.id}`] as HTMLDivElement
        this.dicomEl = this.$refs[`container-${this.id}`] as HTMLDivElement
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
            */
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
                            currentImageIdIndex: this.resource.lastPosition,
                            imageIds
                        }
                        cornerstoneTools.addStackStateManager(this.dicomEl, ['stack'])
                        cornerstoneTools.addToolState(this.dicomEl, 'stack', stackOpts)
                        cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.StackScrollTool)
                        // Set up wwwc tool
                        cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.WwwcTool)
                        // Set up zoom tool
                        cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.ZoomTool, zoomOpts)
                        // Register element to synchronizer
                        this.$root.synchronizer.add(this.dicomEl)
                        this.resource.lastPosition = this.resource.lastPosition
                        // Re-enable the active tool to include this stack
                        this.$store.dispatch('tools:re-enable-active')
                        this.displayImage(true)
                        // Fetch last position from the stack
                    }
                    this.$store.commit('set-cache-status', this.$root.cornerstone.imageCache.getCacheInfo())
                    this.isFirstLoaded = true
                })
            } else {
                // Display first image with default settings
                this.displayImage(true).then((success: boolean) => {
                    if (success) {
                        // Set up wwwc tool
                        cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.WwwcTool)
                        // Set up zoom tool
                        cornerstoneTools.addToolForElement(this.dicomEl, cornerstoneTools.ZoomTool, zoomOpts)
                    }
                    this.isFirstLoaded = true
                })
            }
            // Subscribe to store dispatch events
            this.$store.subscribeAction((action) => {
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
            this.$store.subscribe((mutation) => {
                switch (mutation.type) {
                    // Image is flipped horizontally
                    case 'set-linked-scroll-position':
                        this.scrollLinkedStack(mutation.payload.origin, mutation.payload.position)
                        break
                    case 'add-active-item':
                    case 'remove-active-item':
                        this.resizeImage(this.containerSize as number[])
                        break
                }
            })
        }
        Vue.nextTick(() => {
            this.resizeImage(this.containerSize as number[])
        })
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
        if (this.resource.isStack) {
            // Remove stack scroll tool
            cornerstoneTools.removeToolForElement(this.dicomEl, cornerstoneTools.StackScrollTool)
            // Unregister synchronizer
            this.$root.synchronizer.remove(this.dicomEl)
        }
    },
})

</script>

<style scoped>
.medigi-viewer-image-wrapper {
    position: relative;
    display: inline-block;
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
</style>
