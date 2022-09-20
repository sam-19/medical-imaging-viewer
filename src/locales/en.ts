/** MEDICAL IMAGING STUDY VIEWER ENGLISH LOCALE
 * @package    medimg-viewer
 * @copyright  2020-2022 Sampsa Lohi & University of Eastern Finland
 * @license    MIT
 */

const locApp = require('./en/App.json')
const locRadiology = require('./en/Radiology.json')
const locSettings = require('./en/Settings.json')
const locToolbar = require('./en/Toolbar.json')

const messagesEN = {
    components: {
        App: locApp,
        Radiology: locRadiology,
        Settings: locSettings,
        Toolbar: locToolbar,
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
