/** DICOM VIEWER SIDEBAR COMPONENT TESTS
 * @package    dicom-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

import { shallowMount } from '@vue/test-utils'
import ViewerSidebar from '../ViewerSidebar.vue'

describe('ViewerSidebar.vue', () => {
    const sidebar = shallowMount(ViewerSidebar)
    // Check that component is mounted
    test('component is mounted', () => {
        expect(sidebar.text()).toMatch('')
    })
})
