/** FILI TYPES
 * @package    medimg-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */


 declare module 'd3-interpolate' {
    function interpolateNumber (a: number, b: number): (c: number) => number
    export { interpolateNumber }
}
