/** MEDICAL IMAGING STUDY VIEWER GLOBAL TYPES
 * @package    medimg-viewer
 * @copyright  2020-2022 Sampsa Lohi & University of Eastern Finland
 * @license    MIT
 */
import Vue from "vue"

declare module "vue/types/vue" {
    interface Vue {
        appName: string
        screenPPI: number
    }
}
