/** MEDIGI VIEWER ENTRY SCRIPT
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

import Vue from 'vue'
import { MEDigiI18n, ValidLocale } from './i18n'
import { MEDigiStore, MutationTypes } from './store'
import { FileSystemItem, MediaResource } from './types/assets'

// FontAwesome icons
import { faAdjust } from '@fortawesome/pro-duotone-svg-icons/faAdjust'
import { faArrowAltDown } from '@fortawesome/pro-light-svg-icons/faArrowAltDown'
import { faArrowAltUp } from '@fortawesome/pro-light-svg-icons/faArrowAltUp'
import { faArrowsAltH } from '@fortawesome/pro-regular-svg-icons/faArrowsAltH'
import { faArrowsAltV } from '@fortawesome/pro-regular-svg-icons/faArrowsAltV'
import { faArrows as faArrowsL } from '@fortawesome/pro-light-svg-icons/faArrows'
import { faArrows as faArrowsR } from '@fortawesome/pro-regular-svg-icons/faArrows'
import { faBorderAll } from '@fortawesome/pro-light-svg-icons/faBorderAll'
import { faCaretDown } from '@fortawesome/pro-light-svg-icons/faCaretDown'
import { faCaretUp } from '@fortawesome/pro-solid-svg-icons/faCaretUp'
import { faClone } from '@fortawesome/pro-duotone-svg-icons/faClone'
import { faChevronSquareLeft } from '@fortawesome/pro-solid-svg-icons/faChevronSquareLeft'
import { faChevronSquareRight } from '@fortawesome/pro-solid-svg-icons/faChevronSquareRight'
import { faCompress } from '@fortawesome/pro-duotone-svg-icons/faCompress'
import { faCrosshairs } from '@fortawesome/pro-light-svg-icons/faCrosshairs'
import { faDrawCircle as faDrawCircleL } from '@fortawesome/pro-light-svg-icons/faDrawCircle'
import { faDrawCircle as faDrawCircleR } from '@fortawesome/pro-regular-svg-icons/faDrawCircle'
import { faExpand } from '@fortawesome/pro-regular-svg-icons/faExpand'
import { faHandPaper } from '@fortawesome/pro-light-svg-icons/faHandPaper'
import { faLayerGroup as faLayerGroupL } from '@fortawesome/pro-light-svg-icons/faLayerGroup'
import { faLayerGroup as faLayerGroupR } from '@fortawesome/pro-regular-svg-icons/faLayerGroup'
import { faLink } from '@fortawesome/pro-light-svg-icons/faLink'
import { faRedoAlt } from '@fortawesome/pro-regular-svg-icons/faRedoAlt'
import { faReply } from '@fortawesome/pro-light-svg-icons/faReply'
import { faReplyAll } from '@fortawesome/pro-light-svg-icons/faReplyAll'
import { faRuler as faRulerL } from '@fortawesome/pro-light-svg-icons/faRuler'
import { faRuler as faRulerR } from '@fortawesome/pro-regular-svg-icons/faRuler'
import { faRulerTriangle } from '@fortawesome/pro-light-svg-icons/faRulerTriangle'
import { faSearch as faSearchL } from '@fortawesome/pro-light-svg-icons/faSearch'
import { faSearch as faSearchS } from '@fortawesome/pro-solid-svg-icons/faSearch'
import { faShare } from '@fortawesome/pro-light-svg-icons/faShare'
import { faShareAll } from '@fortawesome/pro-light-svg-icons/faShareAll'
import { faSpinnerThird } from '@fortawesome/pro-duotone-svg-icons/faSpinnerThird'
import { faUndoAlt } from '@fortawesome/pro-regular-svg-icons/faUndoAlt'
import { faUnlink } from '@fortawesome/pro-light-svg-icons/faUnlink'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'

library.add(faAdjust)
library.add(faArrowAltDown)
library.add(faArrowAltUp)
library.add(faArrowsAltH)
library.add(faArrowsAltV)
library.add(faArrowsL)
library.add(faArrowsR)
library.add(faBorderAll)
library.add(faCaretDown)
library.add(faCaretUp)
library.add(faClone)
library.add(faChevronSquareLeft)
library.add(faChevronSquareRight)
library.add(faCompress)
library.add(faCrosshairs)
library.add(faDrawCircleL)
library.add(faDrawCircleR)
library.add(faExpand)
library.add(faHandPaper)
library.add(faLayerGroupL)
library.add(faLayerGroupR)
library.add(faLink)
library.add(faRedoAlt)
library.add(faReply)
library.add(faReplyAll)
library.add(faRulerL)
library.add(faRulerR)
library.add(faRulerTriangle)
library.add(faSearchL)
library.add(faSearchS)
library.add(faShare)
library.add(faShareAll)
library.add(faSpinnerThird)
library.add(faUndoAlt)
library.add(faUnlink)

/**
 * This will mount a Vue-based imaging file viewer to an element with the ID 'medigi-viewer'.
 * You may provide an optional suffix for the container ID, e.g. 'xray' will mount the viewer
 * to the element with the ID 'medigi-viewer-xray' (a separating hyphen is added automatically).
 */
class MEDigiViewer {

    containerId: string = '#medigi-viewer'
    appName: string
    i18n: any
    locale: string
    store: any
    viewer: Vue | undefined = undefined

    /**
     * MEDigi imaging viewer
     * @param appName unique identifier used within the app in case several instances of MEDigiViewer are run on the same page
     * @param idSuffix string following div element ID 'medigi-viewer-<idSuffix>'
     * @param locale app locale
     * @param wpPublicPath: WebPack publick path for script chunk loading
     */
    constructor (
        appName: string = 'app',
        idSuffix?: string,
        locale: ValidLocale = 'en',
        wpPublicPath: string = './'
    ) {
        // Set webpack public path for script chunk loading (only has to be done once in fact)
        __webpack_public_path__ = wpPublicPath
        this.containerId += idSuffix ? `-${idSuffix}` : ''
        this.appName = appName
        this.locale = locale
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
        } else if (typeof url === 'string') {
            // Load a single URL
        }
    }
    /**
     * Load studies from a filesystem-like object.
     * @param fsItem a filesystem-like object (FileSystemItem)
     */
    loadFsItem (fsItem: FileSystemItem): void {
        (this.viewer as any).loadStudiesFromFsItem(fsItem)
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
    async show (): Promise<any> {
        await Promise.all([
            // @ts-ignore: TSLint doesn't seem to recognize Vue component styles at runtime
            import(/* webpackChunkName: "viewer" */'./components/App.vue'),
        ]).then((imports) => {
            const Viewer = imports[0].default
            this.i18n = new MEDigiI18n().setup(Vue)
            this.store = new MEDigiStore().setup(Vue)
            this.store.commit(MutationTypes.SET_APP_NAME, this.appName)
            Vue.component('font-awesome-icon', FontAwesomeIcon)
            // i18n and store need to be passed to Vue as constants
            const i18n = this.i18n
            const store = this.store
            const VM = Vue.extend(Viewer)
            this.viewer = new VM({
                store,
                i18n,
            }).$mount(this.containerId)
            return true
        }).catch((error) => {
            return false
        })
    }

}
// Exports
export { MEDigiViewer }
// Set as a property of window
;(window as any).MEDigiViewer = MEDigiViewer
