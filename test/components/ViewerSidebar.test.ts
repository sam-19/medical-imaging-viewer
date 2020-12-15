/** MEDIGI VIEWER SIDEBAR COMPONENT TESTS
 * @package    medigi-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

import { createLocalVue, shallowMount } from '@vue/test-utils'
import { MEDigiI18n } from '../../src/i18n'
const localVue = createLocalVue()
const i18n = new MEDigiI18n().setup(localVue)
// @ts-ignore: this name mapping is defined in jest config
import ViewerSidebar from '@/components/ViewerSidebar.vue'

describe('ViewerSidebar.vue', () => {
    const sidebar = shallowMount(ViewerSidebar, {
        localVue, i18n,
        stubs: ['font-awesome-icon'],
    })
    // Check that component is mounted
    it('should mount the component', () => {
        expect(sidebar).toBeDefined()
    })
})
