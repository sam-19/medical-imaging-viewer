/** MEDICAL IMAGING STUDY VIEWER ENTRY SCRIPT
 * @package    medimg-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

import Vue from 'vue'
import { MedImgI18n, ValidLocale } from './i18n'
import { MedImgStore, MutationTypes } from './store'
import { FileSystemItem, MediaResource } from './types/common'

// FontAwesome icons
import { faAdjust } from '@fortawesome/pro-duotone-svg-icons/faAdjust'
import { faArrowAltDown } from '@fortawesome/pro-light-svg-icons/faArrowAltDown'
import { faArrowAltLeft } from '@fortawesome/pro-light-svg-icons/faArrowAltLeft'
import { faArrowAltRight } from '@fortawesome/pro-light-svg-icons/faArrowAltRight'
import { faArrowAltUp } from '@fortawesome/pro-light-svg-icons/faArrowAltUp'
import { faArrowsAltH } from '@fortawesome/pro-regular-svg-icons/faArrowsAltH'
import { faArrowsAltV } from '@fortawesome/pro-regular-svg-icons/faArrowsAltV'
import { faArrows as faArrowsL } from '@fortawesome/pro-light-svg-icons/faArrows'
import { faArrows as faArrowsR } from '@fortawesome/pro-regular-svg-icons/faArrows'
import { faBorderAll } from '@fortawesome/pro-light-svg-icons/faBorderAll'
import { faCaretDown } from '@fortawesome/pro-light-svg-icons/faCaretDown'
import { faCaretUp } from '@fortawesome/pro-solid-svg-icons/faCaretUp'
import { faChevronSquareLeft } from '@fortawesome/pro-solid-svg-icons/faChevronSquareLeft'
import { faChevronSquareRight } from '@fortawesome/pro-solid-svg-icons/faChevronSquareRight'
import { faClone } from '@fortawesome/pro-duotone-svg-icons/faClone'
import { faCog as falCog } from '@fortawesome/pro-light-svg-icons/faCog'
import { faCog as farCog } from '@fortawesome/pro-regular-svg-icons/faCog'
import { faCompress } from '@fortawesome/pro-regular-svg-icons/faCompress'
import { faCrosshairs } from '@fortawesome/pro-light-svg-icons/faCrosshairs'
import { faDrawCircle as faDrawCircleL } from '@fortawesome/pro-light-svg-icons/faDrawCircle'
import { faDrawCircle as faDrawCircleR } from '@fortawesome/pro-regular-svg-icons/faDrawCircle'
import { faExclamationTriangle } from '@fortawesome/pro-regular-svg-icons/faExclamationTriangle'
import { faExpand } from '@fortawesome/pro-regular-svg-icons/faExpand'
import { faHandPaper } from '@fortawesome/pro-light-svg-icons/faHandPaper'
import { faLayerGroup as faLayerGroupL } from '@fortawesome/pro-light-svg-icons/faLayerGroup'
import { faLayerGroup as faLayerGroupR } from '@fortawesome/pro-regular-svg-icons/faLayerGroup'
import { faLink } from '@fortawesome/pro-light-svg-icons/faLink'
import { faList } from '@fortawesome/pro-light-svg-icons/faList'
import { faQuestionCircle } from '@fortawesome/pro-duotone-svg-icons/faQuestionCircle'
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
library.add(faArrowAltLeft)
library.add(faArrowAltRight)
library.add(faArrowAltUp)
library.add(faArrowsAltH)
library.add(faArrowsAltV)
library.add(faArrowsL)
library.add(faArrowsR)
library.add(faBorderAll)
library.add(faCaretDown)
library.add(faCaretUp)
library.add(faChevronSquareLeft)
library.add(faChevronSquareRight)
library.add(faClone)
library.add(falCog)
library.add(farCog)
library.add(faCompress)
library.add(faCrosshairs)
library.add(faDrawCircleL)
library.add(faDrawCircleR)
library.add(faExclamationTriangle)
library.add(faExpand)
library.add(faHandPaper)
library.add(faLayerGroupL)
library.add(faLayerGroupR)
library.add(faLink)
library.add(faList)
library.add(faQuestionCircle)
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
 * This will mount a Vue-based imaging file viewer to an element with the ID 'medimg-viewer'.
 * You may provide an optional suffix for the container ID, e.g. 'xray' will mount the viewer
 * to the element with the ID 'medimg-viewer-xray' (a separating hyphen is added automatically).
 */
class MedImgViewer {

    containerId: string = '#medimg-viewer'
    appName: string
    i18n: any
    locale: ValidLocale | null
    store: any
    viewer: Vue | undefined = undefined

    /**
     * Medical imaging study viewer
     * @param appName unique identifier used within the app in case several instances of MedImgViewer are run on the same page
     * @param idSuffix string following div element ID 'medimg-viewer-<idSuffix>'
     * @param locale app locale
     * @param wpPublicPath: WebPack publick path for script chunk loading
     */
    constructor (
        appName: string = 'app',
        idSuffix?: string,
        locale: ValidLocale | null = null,
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
     * @param fsItem a filesystem-like object (FileSystemItem), optional; use cached item if omitted
     */
    loadFsItem (fsItem?: FileSystemItem, autoload=false): void {
        if (fsItem && autoload) {
            (this.viewer as any).loadStudiesFromFsItem(fsItem)
        } else if (fsItem) {
            (this.viewer as any).cacheStudyFsItem(fsItem)
        } else {
            (this.viewer as any).loadStudiesFromFsItem()
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
    settingsChanged (setting: string, value: any) {
        if (setting === 'locale') {
            this.i18n.locale = value
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
            this.store = new MedImgStore().setup(Vue)
            this.store.commit(MutationTypes.SET_APP_NAME, this.appName)
            Vue.component('font-awesome-icon', FontAwesomeIcon)
            this.store.subscribe((mutation: any, state: any) => {
                // Monitor settings changes
                if (mutation.type && mutation.type === 'set-settings-value') {
                    this.settingsChanged(mutation.payload.field, mutation.payload.value)
                }
            })
            // Load locale from store if it wasn't specified
            this.locale = this.locale || this.store.state.SETTINGS.locale as ValidLocale
            this.i18n = new MedImgI18n().setup(Vue, this.locale)
            // i18n and store need to be passed to Vue as constants
            const i18n = this.i18n
            const store = this.store
            // Create app
            const VM = Vue.extend(Viewer)
            this.viewer = new VM({
                store,
                i18n,
            }).$mount(this.containerId)
            return true
        }).catch((error) => {
            console.error(error)
            return false
        })
    }

}
// Exports
export { MedImgViewer }
// Set as a property of window
;(window as any).MedImgViewer = MedImgViewer
