/** DICOM VIEWER
 * @package    dicom-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

import Vue from 'vue'
import fullscreen from 'vue-fullscreen'
import i18n from './i18n'

import DICOMViewer from './components/DICOMViewer.vue'

Vue.use(fullscreen)

function init (containerId: string, fileUrl: string) {
    const DViewer = Vue.extend(DICOMViewer)
    let viewer = new DViewer({
        i18n,
    }).$mount('#'+containerId)
}

export { init }
