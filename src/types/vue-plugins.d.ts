/** MEDICAL IMAGING VIEWER GLOBAL TYPES
 * @package    medimg-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

type MedImgI18n = {
    setup (): any,
    messages: object,
    dateTimeFormats: object,
}

declare module 'vue-fullscreen' {
    import { PluginObject } from 'vue'
    const fullscreen: PluginObject<{}>
    export default fullscreen
}
