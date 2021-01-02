/** MEDIGI VIEWER GLOBAL TYPES
 * @package    medigi-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */
import Vue from "vue"

declare module "vue/types/vue" {
    interface Vue {
        cornerstone: any
    }
}
