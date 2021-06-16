/** CORNERSTONE TOOLS TYPES
 * @package    medimg-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */


declare module 'cornerstone-tools' {
    const external: {
        cornerstone: any
        cornerstoneMath: any
        Hammer: any
    }
    const toolColors: {
        getActiveColor (): any
        setActiveColor (color: string): void
        setToolColor (color: string): void
    }
    const globalImageIdSpecificToolStateManager: {
        restoreToolState (toolState: any): void
        saveToolState (): any
    }
    const AngleTool: any
    const CrosshairsTool: any
    const EllipticalRoiTool: any
    const LengthTool: any
    const OrientationMarkersTool: any
    const PanTool: any
    const ReferenceLinesTool: any
    const StackScrollTool: any
    const stackImagePositionSynchronizer: any
    const StackScrollMouseWheelTool: any
    const updateImageSynchronizer: any
    const WwwcTool: any
    const ZoomTool: any
    function addStackStateManager (element: any, array: any): void
    function addTool (tool: any, options?: any): void
    function addToolForElement (element: any, tool: any, options?: any): void
    function addToolState (element: any, tool: string, options: any): void
    function clearToolState (element: any, tool: string): void
    function getElementToolStateManager (element: any): void
    function getToolState (element: any, tool: string): any
    function importInternal (module: string): any
    function init (config: any): void
    function removeTool (tool: any): void
    function removeToolForElement (element: any, tool: any): void
    function setToolActive (tool: string, options: any): void
    function setToolDisabled (tool: string): void
    function setToolEnabled (tool: string, options: any): void
    function setToolPassive (tool: string): void

    class Synchronizer {
        constructor (tool: string, handler: any)
        add (handler: any): void
    }
}
