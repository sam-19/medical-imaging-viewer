/** CORNERSTONE WADO IMAGE LOADER TYPES
 * @package    medigi-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */


declare module 'cornerstone-wado-image-loader' {
    var external: {
        cornerstone: any,
        dicomParser: any,
    }
    var wadouri: {
        fileManager: {
            add: (uri: File) => string | null
        }
    }
}
