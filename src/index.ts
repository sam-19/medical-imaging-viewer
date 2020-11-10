/** DICOM VIEWER ENTRY SCRIPT
 * @package    dicom-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

import { i18n, validLocale } from './i18n'
import { DICOMResource } from './types/viewer'

// FontAwesome icons
import { faAdjust } from '@fortawesome/pro-duotone-svg-icons/faAdjust'
import { faArrows as faArrowsL } from '@fortawesome/pro-light-svg-icons/faArrows'
import { faArrows as faArrowsR } from '@fortawesome/pro-regular-svg-icons/faArrows'
import { faClone } from '@fortawesome/pro-duotone-svg-icons/faClone'
import { faCompress } from '@fortawesome/pro-duotone-svg-icons/faCompress'
import { faDrawCircle as faDrawCircleL } from '@fortawesome/pro-light-svg-icons/faDrawCircle'
import { faDrawCircle as faDrawCircleR } from '@fortawesome/pro-regular-svg-icons/faDrawCircle'
import { faExpand } from '@fortawesome/pro-regular-svg-icons/faExpand'
import { faLayerGroup as faLayerGroupL } from '@fortawesome/pro-light-svg-icons/faLayerGroup'
import { faLayerGroup as faLayerGroupR } from '@fortawesome/pro-regular-svg-icons/faLayerGroup'
import { faLink } from '@fortawesome/pro-light-svg-icons/faLink'
import { faReply } from '@fortawesome/pro-light-svg-icons/faReply'
import { faReplyAll } from '@fortawesome/pro-light-svg-icons/faReplyAll'
import { faRuler as faRulerL } from '@fortawesome/pro-light-svg-icons/faRuler'
import { faRuler as faRulerR } from '@fortawesome/pro-regular-svg-icons/faRuler'
import { faSearch as faSearchL } from '@fortawesome/pro-light-svg-icons/faSearch'
import { faSearch as faSearchS } from '@fortawesome/pro-solid-svg-icons/faSearch'
import { faShare } from '@fortawesome/pro-light-svg-icons/faShare'
import { faShareAll } from '@fortawesome/pro-light-svg-icons/faShareAll'
import { faUnlink } from '@fortawesome/pro-light-svg-icons/faUnlink'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
library.add(faAdjust)
library.add(faArrowsL)
library.add(faArrowsR)
library.add(faClone)
library.add(faCompress)
library.add(faDrawCircleL)
library.add(faDrawCircleR)
library.add(faExpand)
library.add(faLayerGroupL)
library.add(faLayerGroupR)
library.add(faLink)
library.add(faReply)
library.add(faReplyAll)
library.add(faRulerL)
library.add(faRulerR)
library.add(faSearchL)
library.add(faSearchS)
library.add(faShare)
library.add(faShareAll)
library.add(faUnlink)

/**
 * This will mount a Vue-based DICOM file viewer to an element with the ID 'dicom-viewer'.
 * You may provide an optional suffix for the container ID, e.g. 'xray' will mount the viewer
 * to the element with the ID 'dicom-viewer-xray' (a separating hyphen is required).
 */
class DICOMViewer {

    __webpack_public_path__ = './'

    containerId: string = '#dicom-viewer'
    appName: string = 'app' // This value is affixed to all element ID's to ensure uniqueness
    viewer: Vue | undefined = undefined

    /**
     * DICOMVCiewer constructor.
     * @param containerId optional suffix to add to the default container ID (with a separating hyphen)
     */
    constructor (idSuffix: string | undefined, appName: string | undefined) {
        this.containerId += idSuffix === undefined ? '' : '-' + idSuffix
        this.appName = appName !== undefined ? appName : this.appName
    }

    /**
     * Load DICOM objects defined by the type DICOMResource.
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
     * Load DICOM objects from given URLs.
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
     * Set a new unique identifier to the app. Cannot be called after initialization.
     * @param newName new app name
     */
    setAppName (newName: string): void {
        if (this.viewer === undefined) {
            this.appName = newName
        } else {
            throw new Error(
                i18n.t('Cannot set a new app name after the viewer has been initialized!').toString()
            )
        }
    }

    /**
     * Set the viewer locale.
     * @param newLocale a valid locale code
     */
    setLocale (newLocale: validLocale): void {
        i18n.locale = newLocale
    }

    /**
     * Load the Vue component and display the viewer.
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
            Vue.component('font-awesome-icon', FontAwesomeIcon)
            const VM = Vue.extend(Viewer)
            this.viewer = new VM({
                i18n,
                propsData: { appName: this.appName },
            }).$mount(this.containerId)
        })
    }

}

export { DICOMViewer }
