/** DICOM VIEWER GLOBAL TYPES
 * @package    dicom-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

declare var __webpack_public_path__: string

declare module "*.vue" {
    import Vue from "vue"
    export default Vue
}

declare module 'vue-fullscreen' {
    import { PluginObject } from 'vue'
    const fullscreen: PluginObject<{}>
    export default fullscreen
}
