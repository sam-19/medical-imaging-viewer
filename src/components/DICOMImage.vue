<template>

    <div ref="container" @click="scrollStack()" oncontextmenu="return false // Prevent context menu pop-up on right click">

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
            let viewport = this.$root.cornerstone.getViewport(this.dicomEl)
            viewport.voi.windowWidth += (x / viewport.scale)
            viewport.voi.windowCenter += (y / viewport.scale)
            this.$root.cornerstone.setViewport(this.dicomEl, viewport)
        },
        displayStackImage: function () {
            if (this.resource.hasOwnProperty('images') && this.resource.images.length > this.stackPos) {
                // Display the image at the selected position
                this.$root.cornerstone.loadImage(this.resource.images[this.stackPos].url).then((image: any) => {
                    const viewport = this.$root.cornerstone.getDefaultViewportForImage(this.dicomEl, image)
                    if (viewport) {
                        this.$root.cornerstone.displayImage(this.dicomEl, image, viewport)
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
            if (this.mouseRBtnDown) {
                this.adjustLevels(deltaX, deltaY)
            }
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
            this.displayStackImage()
        },
    },
    mounted () {
        this.dicomEl = this.$refs['container'] as HTMLDivElement
        if (this.dicomEl) {
            // Enable the element
            this.$root.cornerstone.enable(this.dicomEl)
            // See if we only have one image and display it
            if (!this.resource.hasOwnProperty('images')) {
                this.$root.cornerstone.loadImage(this.resource.url).then((image: any) => {
                    const viewport = this.$root.cornerstone.getDefaultViewportForImage(this.dicomEl, image)
                    if (viewport) {
                        this.$root.cornerstone.displayImage(this.dicomEl, image, viewport)
                    }
                }, (error: Error) => {
                    console.error(error)
                })
            } else {
                // Bind mouse wheel scrolling event
                this.dicomEl.addEventListener('wheel', (event: WheelEvent) => {
                    // Prevent default mousewheel event
                    event.stopPropagation()
                    event.preventDefault()
                    if (event.deltaY > 0) {
                        this.scrollStack(1)
                    } else if (event.deltaY < 0) {
                        this.scrollStack(-1)
                    }
                })
                this.displayStackImage()
                Vue.nextTick(() => {
                    this.resizeImage(this.containerSize as number[])
                })
            }
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
        }
    }
})

</script>

<style scoped>

</style>
