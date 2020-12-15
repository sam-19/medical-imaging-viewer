/** MEDIGI VIEWER GLOBAL TYPES
 * @package    medigi-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

declare var __webpack_public_path__: string

type MEDigiI18n = {
    setup (): any,
    messages: object,
    dateTimeFormats: object,
}
type Cornerstone = {
    enable (el: HTMLElement): void,
    loadImage (img: any): Promise<any>,
    displayImage (el: HTMLElement, img: any): void,
}

declare module "*.vue" {
    import Vue from "vue"
    export default Vue
}

declare module 'vue-fullscreen' {
    import { PluginObject } from 'vue'
    const fullscreen: PluginObject<{}>
    export default fullscreen
}