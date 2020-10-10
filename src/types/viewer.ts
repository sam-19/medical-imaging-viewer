/** DICOM VIEWER
 * @package    dicom-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

 interface DICOMResource {
     url: string        // Download URL for the resource
     size: number       // Either byte size or item count
     name: string       // Display name for the resource list
 }

 export { DICOMResource }
