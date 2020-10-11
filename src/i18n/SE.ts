/** DICOM VIEWER
 * @package    dicom-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

const messagesSE = {

}

const datetimeSE = {
    short: {
        year: 'numeric', month: 'numeric', day: 'numeric'
    },
    long: {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: 'numeric', minute: 'numeric'
    },
}

export { messagesSE, datetimeSE }
