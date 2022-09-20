/** CORNERSTONE WADO IMAGE LOADER TYPES
 * @package    medimg-viewer
 * @copyright  2020-2022 Sampsa Lohi & University of Eastern Finland
 * @license    MIT
 */


declare module 'cornerstone-wado-image-loader' {
    var external: {
        cornerstone: any,
        dicomParser: any,
    }
    var wadouri: {
        dataSetCacheManager: {
            get: (uri: string) => any
            getInfo: () => { cacheSizeInBytes: number, numberOfDataSetsCached: number }
            isLoaded: (uri: string) => boolean
            load: (uri: string, loadRequest: XMLHttpRequest, imageId: string) => Promise<any>
            purge: () => void
            unload: (uri: string) => void
        }
        fileManager: {
            add: (uri: File) => string | null
        }
    }
}
