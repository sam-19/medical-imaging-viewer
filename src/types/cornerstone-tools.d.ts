/** CORNERSTONE TOOLS TYPES
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */


declare module 'cornerstone-tools' {
    var external: {
        cornerstone: any,
        cornerstoneMath: any,
        Hammer: any,
    }
    var PanTool: any
    var StackScrollTool: any
    var stackImagePositionSynchronizer: any
    var WwwcTool: any
    var ZoomTool: any
    function addStackStateManager (element: any, array: any): void
    function addTool (tool: any, options?: any): void
    function addToolForElement (element: any, tool: any, options?: any): void
    function addToolState (element: any, tool: string, options: any): void
    function clearToolState (element: any, tool: string): void
    function getElementToolStateManager (element: any): void
    function getToolState (element: any, tool: string): any
    function init (): void
    function removeTool (tool: any): void
    function removeToolForElement (element: any, tool: any): void
    function setToolActive (tool: string, options: any): void
    function setToolDisabled (tool: string): void

    class Synchronizer {
        constructor (tool: string, handler: any)
        add (handler: any): void
    }
}
