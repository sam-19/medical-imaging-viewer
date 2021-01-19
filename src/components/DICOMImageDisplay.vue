<template>

    <div :ref="`container-${resource.id}`" :id="`container-${resource.id}`"
         oncontextmenu="return false // Prevent context menu pop-up on right click"
    ></div>

</template>

<script lang="ts">
import Vue from 'vue'
import DICOMDataProperty from '../assets/dicom/DICOMDataProperty'
import DICOMImage from '../assets/dicom/DICOMImage'
import { MOUSE_BUTTON } from '../types/viewer'
import { ImageResource, ImageStackResource } from '../types/assets'

export default Vue.extend({
    components: {
    },
    props: {
        containerSize: Array, // The size of the entire image media container as [width, height]
        listPosition: Array, // Position of this image in the image list as [index, list length]
        resource: Object, // DICOMResource or DICOMImageStack
    },
    data () {
        return {
            dicomEl: null as unknown as HTMLDivElement, // DICOM image element
            imageStack: [] as any[], // Stack of sorted images
            lastMousePos: [0, 0], // Last mouse position on the screen
            mouseLBtnDown: false, // Is the left mouse button down (depressed)
            mouseMBtnDown: false, // Is the middle mouse button down (depressed)
            mouseRBtnDown: false, // Is the right mouse button down (depressed)
            scrollProgress: 0, // Progress towards a scroll step
            stackPos: 0, // Position in an image stack
            viewport: null as any, // Save this.viewport settings for image stacks
        }
    },
    watch: {
        containerSize (value: Array<number>, old: Array<number>) {
            this.resizeImage(value)
        },
        listPosition (value: Array<number>, old: Array<number>) {
            this.resizeImage(this.containerSize as number[])
        },
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
         * Display the single image from this.resource or current image (this.stackPos) from image stack.
         * @param {boolean} defaultVP use the default viewport settings (resetting any modifications).
         */
        displayImage: function (defaultVP: boolean) {
            const imageUrl = this.resource.type === 'image-stack'
                             ? this.resource.images[this.stackPos].url
                             : this.resource.url
            this.$root.cornerstone.loadImage(imageUrl).then((image: any) => {
                if (defaultVP) {
                    // Set this.viewport to default settings
                    this.viewport = this.$root.cornerstone.getDefaultViewportForImage(this.dicomEl, image)
                }
                if (this.viewport) {
                    this.$root.cornerstone.displayImage(this.dicomEl, image, this.viewport)
                }
            }).catch(() => {
                // TODO: Display error image
            })
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
                    if (this.resource.type !== 'image-stack') {
                        return
                    }
                    // Scroll relative to window height;
                    // half of image height to scroll the full stack, or
                    // if the stack has more images than 1/3 image pixels, one image per pixel
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
            if (!this.dicomEl) {
                return
            }
            if (this.listPosition[1] === 1) {
                // Only one item in the list, we can take up the whole space
                this.dicomEl.style.display = 'block'
                this.dicomEl.style.width = `${dimensions[0]}px`
                this.dicomEl.style.height = `${dimensions[1]}px`
            } else if ((this.listPosition[1] as number) < 4) {
                // Place items side by side
                this.dicomEl.style.display = 'inline-block'
                const maxWidth = dimensions[0]/(this.listPosition[1] as number)
                const relWidth = (this.resource.dimensions[0]/this.resource.dimensions[1])*dimensions[1]
                // Don't crop the image container
                if (relWidth < maxWidth) {
                    this.dicomEl.style.width = `${relWidth}px`
                } else {
                    this.dicomEl.style.width = `${maxWidth}px`
                }
                this.dicomEl.style.height = `${dimensions[1]}px`
            }
            this.$root.cornerstone.resize(this.dicomEl, false)
            // Store the resized viewport (or it will reset to initial config when the stack is scrolled)
            this.viewport = this.$root.cornerstone.getViewport(this.dicomEl)
            //this.$root.cornerstone.setViewport(this.dicomEl, this.viewport)
        },
        /**
         * Scroll the image stack.
         * @param {number} delta positive or negative number (absolute amount is irrelevant).
         */
        scrollStack: function (delta: number) {
            // Don't scroll out of bounds
            if (delta < 0 && this.stackPos + delta < 0) {
                this.stackPos = 0
            } else if (delta > 0 && this.stackPos + delta >= this.resource.images.length) {
                this.stackPos = this.resource.images.length - 1
            } else {
                this.stackPos += delta
            }
            this.resource.lastPosition = this.stackPos
            this.displayImage(false)
        },
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
        this.dicomEl = this.$refs[`container-${this.resource.id}`] as HTMLDivElement
        if (this.dicomEl) {
            // Enable the element
            this.$root.cornerstone.enable(this.dicomEl)
            // Bind mouse interaction listeners
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
            // Save viewport
            this.viewport = this.$root.cornerstone.getViewport(this.dicomEl)
            // Sort the images if the resource is an image stack
            if (this.resource.type === 'image-stack') {
                this.resource.preloadAndSortImages((success: boolean) => {
                    if (success) {
                        // Fetch last position from the stack
                        this.stackPos = this.resource.lastPosition
                        this.displayImage(true)
                    }
                    this.$store.commit('SET_CACHE_STATUS', this.$root.cornerstone.imageCache.getCacheInfo())
                })
            } else {
                // Display first image with default settings
                this.displayImage(true)
            }
            // Start listening to some global events
            this.$root.$on('invert-media-colors', this.invertImage)
            this.$root.$on('restore-default-viewport', this.resetViewport)
        }
        Vue.nextTick(() => {
            this.resizeImage(this.containerSize as number[])
        })
    },
    beforeDestroy () {
        this.$root.$off('invert-media-colors', this.invertImage)
        this.$root.$off('restore-default-viewport', this.resetViewport)
    },
})

</script>

<style scoped>

</style>
