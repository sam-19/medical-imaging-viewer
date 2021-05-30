/** MEDIGI VIEWER ENGLISH LOCALE
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

const locApp = require('./en/App.json')
const locEEG = require('./en/EEG.json')
const locEKG = require('./en/EKG.json')
const locRadiology = require('./en/Radiology.json')
const locSettings = require('./en/Settings.json')

const messagesEN = {
    components: {
        App: locApp,
        EEG: locEEG,
        EKG: locEKG,
        Radiology: locRadiology,
        Settings: locSettings,
    },
    datetime: '{y}/{m}/{d} {h}:{min}',
}

const datetimeUS = {
    short: {
        year: 'numeric', month: 'numeric', day: 'numeric',
    },
    long: {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: 'numeric', minute: 'numeric',
    },
}

export { messagesEN, datetimeUS }
