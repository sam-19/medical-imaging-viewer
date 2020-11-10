/** DICOM VIEWER I18N MODULE
 * @package    dicom-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

import Vue from 'vue'
import VueI18n from 'vue-i18n'

import { messagesEN, datetimeUS } from './locales/en'
import { messagesFI, datetimeFI } from './locales/fi'
import { messagesSE, datetimeSE } from './locales/se'

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
