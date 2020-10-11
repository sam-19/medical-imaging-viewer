/** DICOM VIEWER VIEWER COMPONENT TESTS
 * @package    dicom-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

import { shallowMount } from '@vue/test-utils'
import Viewer from '../Viewer.vue'

describe('Viewer.vue', () => {
    const viewer = shallowMount(Viewer)
    // Check that component is mounted
    test('component is mounted', () => {
        expect(viewer.text()).toMatch('')
    })
})
