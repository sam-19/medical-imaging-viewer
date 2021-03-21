/** MEDIGI VIEWER GLOBAL TYPES
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

type MEDigiI18n = {
    setup (): any,
    messages: object,
    dateTimeFormats: object,
}

declare module 'vue-fullscreen' {
    import { PluginObject } from 'vue'
    const fullscreen: PluginObject<{}>
    export default fullscreen
}
