/** MEDIGI VIEWER ENTRY SCRIPT
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

import { MEDigiI18n, ValidLocale } from './i18n'
import { MEDigiStore, MutationTypes } from './store'
import { MediaResource } from './types/assets'

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
library.add(faUndoAlt)
library.add(faUnlink)

const VIEWERS = [] as MEDigiViewer[]
/**
 * Create a new viewer instance and add it to the list.
 * @param config a configration object containing
 * * appName: unique name for this viewer
 * * autoStart: start the app immediately
 * * environment: script environment
 * * idSuffix: suffix to use after mount div id
 * * locale: app locale
 * * url: a single URL, array or URLs or filesystem-like object of file URLs to load (only if autoStart is true)
 * * wpPublicPath: WebPack publick path for script chunk loading
 * @param jsonConfig config is a JSON object (default false)
 * @return the created viewer
 */
function createMEDigiViewerInstance (config?: any, jsonConfig = false) {
    if (jsonConfig && config) {
        config = JSON.parse(config)
    }
    const viewer = new MEDigiViewer(config?.appName, config?.idSuffix, config?.locale, config?.wpPublicPath)
    if (config?.autoStart) {
        viewer.show()
        if (config.url) {
            viewer.loadUrl(config.url)
        }
    }
    VIEWERS.push(viewer)
    return viewer
}

/**
 * Get the first MEDigiViewer by given appName or if omitted, the last created viewer instance.
 * @param appName optional app id
 * @returns MEDigiViewer or undefined
 */
function getMEDigiViewerInstance (appName?: string) {
    if (appName) {
        for (let i=0; i<VIEWERS.length; i++) {
            if (VIEWERS[i].appName === appName) {
                return VIEWERS[i]
            }
        }
    } else if (VIEWERS.length) {
        return VIEWERS[VIEWERS.length -1]
    }
    return undefined
}

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
     * @param url a single url string, array of url strings or a filesystem-like object
     */
    loadUrl (url: any): void {
        if (this.viewer === undefined) {
            // Viewer must be initialized first
            return
        }
        if (Array.isArray(url)) {
            // Load a list of URLs
        } else if (typeof url === 'string') {
            // Load a single URL
        } else {
            // Load filesystem of URLs
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
            // @ts-ignore: TSLint doesn't seem to recognize Vue component styles at runtime
            import(/* webpackChunkName: "viewer" */'./components/App.vue'),
        ]).then((imports) => {
            const Vue = imports[0].default
            const Fullscreen = imports[1].default
            const Viewer = imports[2].default
            Vue.use(Fullscreen)
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
        })
    }

}
// Default export
export { createMEDigiViewerInstance, getMEDigiViewerInstance, MEDigiViewer }
// Set as a property of window
;(window as any).MEDigiViewer = MEDigiViewer
