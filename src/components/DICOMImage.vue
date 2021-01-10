<template>

    <div ref="container" oncontextmenu="return false // Prevent context menu pop-up on right click">

    </div>

</template>

<script lang="ts">
import Vue from 'vue'
import { MOUSE_BUTTON, DICOMImageStack, DICOMResource } from '../types/viewer'

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
        adjustLevels: function (x: number, y: number) {
            this.viewport.voi.windowWidth += (x / this.viewport.scale)
            this.viewport.voi.windowCenter += (y / this.viewport.scale)
            this.$root.cornerstone.setViewport(this.dicomEl, this.viewport)
        },
        displayStackImage: function (defaultVP: boolean) {
            if (this.resource.hasOwnProperty('images') && this.resource.images.length > this.stackPos) {
                // Display the image at the selected position
                this.$root.cornerstone.loadImage(this.resource.images[this.stackPos].url).then((image: any) => {
                    if (defaultVP) {
                        // Set this.viewport to default settings
                        this.viewport = this.$root.cornerstone.getDefaultViewportForImage(this.dicomEl, image)
                    }
                    if (this.viewport) {
                        this.$root.cornerstone.displayImage(this.dicomEl, image, this.viewport)
                    }
                }, (error: Error) => {
                    console.error(error)
                })
            }
        },
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
                    this.scrollStack(deltaY)
                } else if (activeTool === 'zoom') {
                    this.zoomImage(deltaY)
                }
            } else if (this.mouseMBtnDown) {
                this.zoomImage(deltaY)
            } else if (this.mouseRBtnDown) {
                this.adjustLevels(deltaX, deltaY)
            }
        },
        panImage: function (x: number, y: number) {
            this.viewport.translation.x -= (x / this.viewport.scale)
            this.viewport.translation.y -= (y / this.viewport.scale)
            this.$root.cornerstone.setViewport(this.dicomEl, this.viewport)
        },
        resetImage: function () {
            this.displayStackImage(true)
        },
        resizeImage: function (dimensions: Array<number>) {
            if (this.listPosition[1] === 1) {
                // Only one item in the list, we can take up the whole space
                let container = this.$refs['container'] as HTMLDivElement
                container.style.width = `${dimensions[0]}px`
                container.style.height = `${dimensions[1]}px`
                this.$root.cornerstone.resize(container)
            }
        },
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
            // Start listening to some global events
            this.$root.$off('reset-default-viewport')
            this.$root.$on('reset-default-viewport', () => {
                this.displayStackImage(true)
            })
            // Display first image with default settings
            this.displayStackImage(true)
        }
        Vue.nextTick(() => {
            this.resizeImage(this.containerSize as number[])
        })
    }
})

</script>

<style scoped>

</style>
