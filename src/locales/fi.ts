/** MEDICAL IMAGING STUDY VIEWER FINNISH LOCALE
 * @package    medimg-viewer
 * @copyright  2020-2022 Sampsa Lohi & University of Eastern Finland
 * @license    MIT
 */

const locApp = require('./fi/App.json')
const locRadiology = require('./fi/Radiology.json')
const locSettings = require('./fi/Settings.json')
const locToolbar = require('./fi/Toolbar.json')

const messagesFI = {
    components: {
        App: locApp,
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
