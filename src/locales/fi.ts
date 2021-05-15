/** MEDIGI VIEWER FINNISH LOCALE
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

const messagesFI = {
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
