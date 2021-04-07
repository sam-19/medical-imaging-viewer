/** MEDIGI TOPOGRAM REFERENCE LINE TOOL
 * A replacement for the default reference lines tool specifically for topogram elements.
 * It includes scaling of the reference line (at the time of writing this tool https://github.com/cornerstonejs/cornerstone/pull/476 was not merged).
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

import * as cornerstone from 'cornerstone-core'
import cornerstoneTools from 'cornerstone-tools'

const BaseTool = cornerstoneTools.importInternal('base/BaseTool')
const draw = cornerstoneTools.importInternal('drawing/draw')
const drawLine = cornerstoneTools.importInternal('drawing/drawLine')
const getNewContext = cornerstoneTools.importInternal('drawing/getNewContext')
const waitForEnabledElementImageToLoad = cornerstoneTools.importInternal('util/waitForEnabledElementImageToLoad')

const renderActiveReferenceLine = (context: any, eventData: any, referenceLine: any, targetElement: any) => {
    const imageId = eventData.image.imageId
    const color = cornerstoneTools.toolColors.getActiveColor()
    if (!imageId || !referenceLine || !targetElement || !context || !color) {
        return
    }
    draw(context, (context: any) => {
        drawLine(
            context,
            targetElement,
            referenceLine.start,
            referenceLine.end,
            { color }
        )
    })
}

export default class TopogramReferenceLineTool extends BaseTool {
    constructor(props: any = {}) {
        const defaultProps = {
            name: `TopogramReferenceLines`,
            mixins: ['enabledOrDisabledBinaryTool'],
            configuration: {
                renderer: renderActiveReferenceLine,
            },
        }
        super(props, defaultProps)
        this.renderer = null
        this.synchronizationContext = null
        this.getReferenceLine = null
    }
    async enabledCallback (element: HTMLElement, conf: any = {}) {
        const renderer = this.configuration.renderer
        const enabledElement = await waitForEnabledElementImageToLoad(element)
        if (!enabledElement || !renderer) {
          return
        }
        this.renderer = renderer
        // This isn't actually used right now
        this.synchronizationContext = conf.synchronizationContext || null
        this.getReferenceLine = conf.getReferenceLine || null
        this.forceImageUpdate(element)
      }

    disabledCallback(element: HTMLElement) {
        this.forceImageUpdate(element)
    }

    forceImageUpdate(element: HTMLElement) {
        const enabledElement = cornerstone.getEnabledElement(element)
        if (enabledElement.image) {
            cornerstone.updateImage(element, false)
        }
    }

    renderToolData (evt: any) {
        if (!this.renderer || !this.getReferenceLine) {
            return
        }
        const eventData = evt.detail
        // Get the enabled elements associated with this synchronization context and draw them
        const context = getNewContext(eventData.canvasContext.canvas)
        cornerstone.setToPixelCoordinateSystem(
            eventData.enabledElement,
            context
        )
        // Render the line
        this.renderer(
            context,
            eventData,
            this.getReferenceLine(),
            eventData.element
        )
    }
}
