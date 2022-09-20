/** MEDICAL IMAGING STUDY VIEWER GLOBAL TYPES
 * @package    medimg-viewer
 * @copyright  2020-2022 Sampsa Lohi & University of Eastern Finland
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
