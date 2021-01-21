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
    var StackScrollTool: any
    var stackImagePositionSynchronizer: any
    function setToolActive (too: string, options: any): void
    function addStackStateManager (element: any, array: any): void
    function addToolState (element: any, tool: string, options: any): void
    function addTool (tool: any): void
    function init (): void

    class Synchronizer {
        constructor (tool: string, handler: any)
        add (handler: any): void
    }
}
