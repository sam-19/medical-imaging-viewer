/** MEDICAL IMAGING VIEWER FINNISH LOCALE
 * @package    medimg-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

const locApp = require('./fi/App.json')
const locEEG = require('./fi/EEG.json')
const locEKG = require('./fi/EKG.json')
const locRadiology = require('./fi/Radiology.json')
const locSettings = require('./fi/Settings.json')
const locToolbar = require('./fi/Toolbar.json')

const messagesFI = {
    components: {
        App: locApp,
        EEG: locEEG,
        EKG: locEKG,
        Radiology: locRadiology,
        Settings: locSettings,
        Toolbar: locToolbar,
    },
    datetime: '{d}.{m}.{y} {h}:{min}',
}

const datetimeFI = {
    short: {
        year: 'numeric', month: 'numeric', day: 'numeric',
    },
    long: {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: 'numeric', minute: 'numeric',
    },
}

export { messagesFI, datetimeFI }
