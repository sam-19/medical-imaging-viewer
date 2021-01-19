<template>

    <div ref="container" oncontextmenu="return false // Prevent context menu pop-up on right click">

    </div>

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
            stackPos: 0, // Position in an image stack
            viewport: null as any, // Save this.viewport settings for image stacks
        }
    },
    watch: {
        containerSize (value: Array<number>, old: Array<number>) {
            this.resizeImage(value)
        },
        listPosition (value: Array<number>, old: Array<number>) {
            // TODO: Update display
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
         * Display a single image from this.resource.
         * @param {boolean} defaultVP use the default viewport settings (resetting any modifications).
         */
        displayImage: function (defaultVP: boolean) {
            if (this.resource.type !== 'image') {
                return
            }
            this.$root.cornerstone.loadImage(this.resource.url).then((image: any) => {
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
         * Display the image located at this.stackPos.
         * @param {boolean} defaultVP use the default viewport settings (resetting any modifications).
         */
        displayStackImage: function (defaultVP: boolean) {
            if (this.resource.type === 'image-stack' && this.resource.length > this.stackPos) {
                // Display the image at the selected position
                this.$root.cornerstone.loadImage(this.resource.images[this.stackPos].url).then((image: any) => {
                    if (defaultVP) {
                        // Set this.viewport to default settings
                        this.viewport = this.$root.cornerstone.getDefaultViewportForImage(
                            this.dicomEl, image
                        )
                    }
                    if (this.viewport) {
                        this.$root.cornerstone.displayImage(
                            this.dicomEl, image, this.viewport
                        )
                    }
                }).catch(() => {
                    // TODO: Display error image
                })
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
                    this.scrollStack(-deltaY)
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
         * Reset the displayed image to default viewport settings.
         */
        resetImage: function () {
            this.displayStackImage(true)
        },
        /**
         * Resize the displayed image into given dimensions.
         * @param {number[]} dimensions [width, height].
         */
        resizeImage: function (dimensions: Array<number>) {
            if (this.listPosition[1] === 1) {
                // Only one item in the list, we can take up the whole space
                let container = this.$refs['container'] as HTMLDivElement
                container.style.width = `${dimensions[0]}px`
                container.style.height = `${dimensions[1]}px`
                this.$root.cornerstone.resize(container)
            }
        },
        /**
         * Scroll the image stack.
         * @param {number} delta positive or negative number (absolute amount is irrelevant).
         */
        scrollStack: function (delta: number) {
            // Don't scroll out of bounds
            if (delta < 0 && this.stackPos + delta < 0) {
                this.stackPos = 0
            } else if (delta > 0 && this.stackPos + delta > this.resource.images.length) {
                this.stackPos = this.resource.images.length - 1
            } else {
                this.stackPos += delta
            }
            this.displayStackImage(false)
        },
        /**
         * Preload the image stack images into cache and sort them by instance number.
         */
        preloadAndSortStackImages: function () {
            /*
            if (!this.resource.hasOwnProperty('images')) {
                return
            }
            for (let i=0; i<this.resource.images.length; i++) {
                this.$root.cornerstone.loadAndCacheImage(this.resource.images[i].url).then((image: any) => {
                    const loadedImg = new DICOMImage(
                        this.resource.images[i].url,
                        this.resource.images[i].size,
                        this.resource.images[i].name
                    )
                    loadedImg.readMetadataFromImage(image)
                    // Add the image object to stack
                    this.imageStack.push(loadedImg)
                    if (this.imageStack.length === this.resource.images.length) {
                        // All images have been loaded, sort them according to Instance Number
                        this.imageStack.sort((a: any, b: any) => {
                            const aPos = a.instanceNumber || 0
                            const bPos = b.instanceNumber || 0
                            return aPos - bPos
                        })
                        // Display first image with default settings
                        this.displayStackImage(true)
                    }
                    // Emit the change in image cache status
                })
            }
            */
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
        this.dicomEl = this.$refs['container'] as HTMLDivElement
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
                        this.displayStackImage(true)
                    }
                    this.$store.commit('SET_CACHE_STATUS', this.$root.cornerstone.imageCache.getCacheInfo())
                })
            } else {
                // Display first image with default settings
                this.displayImage(true)
            }
            // Start listening to some global events
            this.$root.$off('reset-default-viewport')
            this.$root.$on('reset-default-viewport', () => {
                this.displayStackImage(true)
            })
        }
        Vue.nextTick(() => {
            this.resizeImage(this.containerSize as number[])
        })
    }
})

</script>

<style scoped>

</style>
