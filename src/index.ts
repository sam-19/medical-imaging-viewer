/** DICOM VIEWER ENTRY SCRIPT
 * @package    dicom-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

import { i18n, validLocale } from './i18n'
import { DICOMResource } from './types/viewer'


/**
 * This will mount a Vue-based DICOM file viewer to an element with the ID 'dicom-viewer'.
 * You may provide an optional suffix for the container ID, e.g. 'xray' will mount the viewer
 * to the element with the ID 'dicom-viewer-xray' (a separating hyphen is required).
 */
class DICOMViewer {

    containerId: string = '#dicom-viewer'
    viewer: Vue | undefined = undefined

    /**
     * DICOMVCiewer constructor
     * @param containerId optional suffix to add to the default container ID (with a separating hyphen)
     */
    constructor (idSuffix: string | undefined) {
        this.containerId += idSuffix === undefined ? '' : '-' + idSuffix
    }

    /**
     * Load DICOM objects defined by the type DICOMResource
     * @param resource a single resource or an array of resources
     */
    loadResource (resource: DICOMResource | DICOMResource[]): void {
        if (this.viewer === undefined) {
            // Viewer must be initialized first
            return
        }
        if (Array.isArray(resource)) {
            // Load a list of resources
        } else {
            // Load a single resource
        }
    }

    /**
     * Load DICOM objects from given URLs
     * @param url a single url string or an array of url strings
     */
    loadUrl (url: string | string[]): void {
        if (this.viewer === undefined) {
            // Viewer must be initialized first
            return
        }
        if (Array.isArray(url)) {
            // Load a list of URLs
        } else {
            // Load a single URL
        }
    }

    /**
     * Set the viewer locale
     * @param newLocale a valid locale code
     */
    setLocale (newLocale: validLocale): void {
        i18n.locale = newLocale
    }

    /**
     * Load the Vue component and display the viewer
     */
    show (): void {
        Promise.all([
            import(/* webpackChunkName: "vue" */'vue'),
            import(/* webpackChunkName: "fullscreen" */'vue-fullscreen'),
            import(/* webpackChunkName: "viewer" */'./components/Viewer.vue'),
        ]).then((imports) => {
            const Vue = imports[0].default
            const Fullscreen = imports[1].default
            const Viewer = imports[2].default
            Vue.use(Fullscreen)
            const DViewer = Vue.extend(Viewer)
            this.viewer = new DViewer({
                i18n,
            }).$mount(this.containerId)
        })
    }

}

export { DICOMViewer }
