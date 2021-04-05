/** MEDIGI VIEWER I18N MODULE
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

import { VueConstructor } from 'vue'
import VueI18n from 'vue-i18n'

import { messagesEN, datetimeUS } from './locales/en'
import { messagesFI, datetimeFI } from './locales/fi'
import { messagesSE, datetimeSE } from './locales/se'

class MEDigiI18n {
    messages = {
        en: messagesEN,
        fi: messagesFI,
        se: messagesSE,
    }
    dateTimeFormats = {
        'en-US': datetimeUS,
        'fi-FI': datetimeFI,
        'se-FI': datetimeSE,
    }
    /**
     * Get i18n applied to the given instance
     * @param vueInstance A vue instance (real or test)
     * @return VueI18n
     */
    setup (vueInstance: VueConstructor): VueI18n {
        vueInstance.use(VueI18n)
        return new VueI18n({
            locale: 'en',
            fallbackLocale: 'en',
            messages: this.messages,
            dateTimeFormats: this.dateTimeFormats as any,
            silentTranslationWarn: true,
        })
    }
}

type ValidLocale = 'en' | 'fi' | 'se'
export { MEDigiI18n, ValidLocale }
