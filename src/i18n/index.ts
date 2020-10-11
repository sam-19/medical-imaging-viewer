/** DICOM VIEWER
 * @package    dicom-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

import Vue from 'vue'
import VueI18n from 'vue-i18n'

import { messagesEN, datetimeUS } from './EN'
import { messagesFI, datetimeFI } from './FI'
import { messagesSE, datetimeSE } from './SE'

Vue.use(VueI18n)

const messages = {
    en: messagesEN,
    fi: messagesFI,
    se: messagesSE,
}

const dateTimeFormats = {
    'en-US': datetimeUS,
    'fi-FI': datetimeFI,
    'se-FI': datetimeSE,
}

const i18n = new VueI18n({
    locale: 'en',
    fallbackLocale: 'en',
    messages: messages,
    dateTimeFormats: dateTimeFormats,
})

type validLocale = 'en' | 'fi' | 'se'
export { i18n, validLocale }
