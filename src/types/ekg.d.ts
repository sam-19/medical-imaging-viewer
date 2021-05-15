/** MEDIGI VIEWER EKG TYPES
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

import { BiosignalResource, BiosignalChannel } from './common'

interface DicomEkgResource extends BiosignalResource {

}

interface DicomEkgChannel extends BiosignalChannel {
    baseline?: number
    filterLow?: number
    filterHigh?: number
    filterNotch?: number
    sensitivityCF?: number
    timeSkew?: number
}

export { DicomEkgChannel, DicomEkgResource }
