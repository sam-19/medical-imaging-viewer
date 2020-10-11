/** DICOM VIEWER TOOLBAR COMPONENT TESTS
 * @package    dicom-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

import { shallowMount } from '@vue/test-utils'
import ViewerToolbar from '../ViewerToolbar.vue'

describe('ViewerToolbar.vue', () => {
    const toolbar = shallowMount(ViewerToolbar)
    // Check that component is mounted
    test('component is mounted', () => {
        expect(toolbar.text()).toMatch('')
    })
})
