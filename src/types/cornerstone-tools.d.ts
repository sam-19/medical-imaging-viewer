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
    function init (): void
}
