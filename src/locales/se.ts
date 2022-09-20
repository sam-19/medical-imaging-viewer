/** MEDICAL IMAGING STUDY VIEWER SWEDISH LOCALE
 * @package    medimg-viewer
 * @copyright  2020-2022 Sampsa Lohi & University of Eastern Finland
 * @license    MIT
 */

const locApp = require('./se/App.json')
const locRadiology = require('./se/Radiology.json')
const locSettings = require('./se/Settings.json')
const locToolbar = require('./se/Toolbar.json')

const messagesSE = {
    components: {
        App: locApp,
        Radiology: locRadiology,
        Settings: locSettings,
        Toolbar: locToolbar,
    },
    datetime: '{d}.{m}.{y} {h}:{min}',
}

const datetimeSE = {
    short: {
        year: 'numeric', month: 'numeric', day: 'numeric',
    },
    long: {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: 'numeric', minute: 'numeric',
    },
}

export { messagesSE, datetimeSE }
