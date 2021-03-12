/** MEDIGI VIEWER ENGLISH LOCALE
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

const messagesEN = {
    days_short: "d",
    orientation: {
        anterior: 'A',
        caudal: 'F',
        cranial: 'H',
        left: 'L',
        posterior: 'P',
        right: 'R'
    },
    sidebaritem: {
        channelcount: '%{count} channels',
        imagecount: '%{count} images',
    },
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
