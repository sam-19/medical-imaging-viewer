/** MEDICAL IMAGING STUDY VIEWER GLOBAL TYPES
 * @package    medimg-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */
import Vue from "vue"

declare module "vue/types/vue" {
    interface Vue {
        appName: string
        screenPPI: number
    }
}
