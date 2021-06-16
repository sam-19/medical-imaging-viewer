/** MEDICAL IMAGING VIEWER I18N MODULE
 * @package    medimg-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

import { VueConstructor } from 'vue'
import VueI18n from 'vue-i18n'

import { messagesEN, datetimeUS } from './locales/en'
import { messagesFI, datetimeFI } from './locales/fi'
import { messagesSE, datetimeSE } from './locales/se'

class MedImgI18n {
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
    setup (vueInstance: VueConstructor, locale: ValidLocale): VueI18n {
        vueInstance.use(VueI18n)
        return new VueI18n({
            locale: locale,
            fallbackLocale: 'en',
            messages: this.messages,
            dateTimeFormats: this.dateTimeFormats as any,
            silentTranslationWarn: true,
        })
    }
}

type ValidLocale = 'en' | 'fi' | 'se'
export { MedImgI18n, ValidLocale }
