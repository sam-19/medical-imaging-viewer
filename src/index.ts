/** DICOM VIEWER
 * @package    dicom-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

import Vue from 'vue'
import fullscreen from 'vue-fullscreen'
import i18n from './i18n'

import { viewerResource } from './types/viewer'

import Viewer from './components/Viewer.vue'

Vue.use(fullscreen)

class DICOMViewer {

    containerId: string

    constructor (containerId: string | undefined) {
        this.containerId = containerId === undefined ? '' : '-' + containerId
    }

    loadResource (resource: viewerResource | viewerResource[]): void {
        if (Array.isArray(resource)) {
            // Load a list of resources
        } else {
            // Load a single resource
        }
    }

    show (): void {
        const DViewer = Vue.extend(Viewer)
        let viewer = new DViewer({
            i18n,
        }).$mount('#dicom-viewer'+this.containerId)
    }

}

export { DICOMViewer }
