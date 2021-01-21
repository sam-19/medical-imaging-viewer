/** MEDIGI VIEWER ENTRY SCRIPT
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

import { MEDigiI18n, validLocale } from './i18n'
import { MEDigiStore, MutationTypes } from './store'
import { MediaResource } from './types/assets'

// FontAwesome icons
import { faAdjust } from '@fortawesome/pro-duotone-svg-icons/faAdjust'
import { faArrowsAltH } from '@fortawesome/pro-regular-svg-icons/faArrowsAltH'
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
import { faRedoAlt } from '@fortawesome/pro-regular-svg-icons/faRedoAlt'
import { faReply } from '@fortawesome/pro-light-svg-icons/faReply'
import { faReplyAll } from '@fortawesome/pro-light-svg-icons/faReplyAll'
import { faRuler as faRulerL } from '@fortawesome/pro-light-svg-icons/faRuler'
import { faRuler as faRulerR } from '@fortawesome/pro-regular-svg-icons/faRuler'
import { faSearch as faSearchL } from '@fortawesome/pro-light-svg-icons/faSearch'
import { faSearch as faSearchS } from '@fortawesome/pro-solid-svg-icons/faSearch'
import { faShare } from '@fortawesome/pro-light-svg-icons/faShare'
import { faShareAll } from '@fortawesome/pro-light-svg-icons/faShareAll'
import { faUndoAlt } from '@fortawesome/pro-regular-svg-icons/faUndoAlt'
import { faUnlink } from '@fortawesome/pro-light-svg-icons/faUnlink'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'

library.add(faAdjust)
library.add(faArrowsAltH)
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
library.add(faRedoAlt)
library.add(faReply)
library.add(faReplyAll)
library.add(faRulerL)
library.add(faRulerR)
library.add(faSearchL)
library.add(faSearchS)
library.add(faShare)
library.add(faShareAll)
library.add(faUndoAlt)
library.add(faUnlink)

/**
 * This will mount a Vue-based imaging file viewer to an element with the ID 'medigi-viewer'.
 * You may provide an optional suffix for the container ID, e.g. 'xray' will mount the viewer
 * to the element with the ID 'medigi-viewer-xray' (a separating hyphen is required).
 */
class MEDigiViewer {

    __webpack_public_path__ = './'

    containerId: string = '#medigi-viewer'
    appName: string = 'app'
    locale: string
    viewer: Vue | undefined = undefined

    /**
     * MEDigi imaging viewer
     * @param idSuffix string following component ID 'medigi-viewer'
     * @param appName unique identifier used within the app to ensure uniqueness if several instances of MEDigiViewer are run on the same page
     * @param locale app locale
     */
    constructor (
        idSuffix: string | undefined,
        appName: string | undefined,
        locale: validLocale | undefined
    ) {
        this.containerId += idSuffix === undefined ? '' : '-' + idSuffix
        this.appName = appName !== undefined ? appName : this.appName
        this.locale = locale !== undefined ? locale : 'en'
    }

    /**
     * Load DICOM objects defined by the type DICOMResource.
     * @param resource a single resource or an array of resources
     */
    loadResource (resource: MediaResource | MediaResource[]): void {
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
                'Cannot set a new app name after the viewer has been initialized!'
            )
        }
    }

    /**
     * Load the Vue component and display the viewer.
     */
    show (): void {
        Promise.all([
            import(/* webpackChunkName: "vue" */'vue'),
            import(/* webpackChunkName: "fullscreen" */'vue-fullscreen'),
            // @ts-ignore: TSLint doesn't seem recognize Vue component styles at runtime
            import(/* webpackChunkName: "viewer" */'./components/App.vue'),
        ]).then((imports) => {
            const Vue = imports[0].default
            const Fullscreen = imports[1].default
            const Viewer = imports[2].default
            Vue.use(Fullscreen)
            const i18n = new MEDigiI18n().setup(Vue)
            const store = new MEDigiStore().setup(Vue)
            store.commit(MutationTypes.SET_APP_NAME, this.appName)
            Vue.component('font-awesome-icon', FontAwesomeIcon)
            const VM = Vue.extend(Viewer)
            this.viewer = new VM({
                store,
                i18n,
                propsData: { appName: this.appName },
            }).$mount(this.containerId)
        })
    }

}
// Default export
export default MEDigiViewer
// Set as a property of window
;(window as any).MEDigiViewer = MEDigiViewer
