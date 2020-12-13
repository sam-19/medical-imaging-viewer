/** MEDIGI VIEWER SIDEBAR COMPONENT TESTS
 * @package    medigi-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

import { shallowMount } from '@vue/test-utils'
// @ts-ignore: this name mapping is defined in jest config
import ViewerSidebar from '@/components/ViewerSidebar.vue'

describe('ViewerSidebar.vue', () => {
    const sidebar = shallowMount(ViewerSidebar, { stubs: ['font-awesome-icon'] })
    // Check that component is mounted
    it('should mount the component', () => {
        expect(sidebar).toBeDefined()
    })
})
