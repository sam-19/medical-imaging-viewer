/** MEDIGI VIEWER TOOLBAR COMPONENT TESTS
 * @package    medigi-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

import { shallowMount } from '@vue/test-utils'
// @ts-ignore: this name mapping is defined in jest config
import ViewerToolbar from '@/components/ViewerToolbar.vue'

describe('ViewerToolbar.vue', () => {
    const toolbar = shallowMount(ViewerToolbar, { stubs: ['font-awesome-icon'] })
    // Check that component is mounted
    it('should mount the component', () => {
        expect(toolbar).toBeDefined()
    })
})
