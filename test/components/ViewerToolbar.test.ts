/** MEDIGI VIEWER TOOLBAR COMPONENT TESTS
 * @package    medigi-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

import { createLocalVue, shallowMount } from '@vue/test-utils'
import { MEDigiI18n } from '../../src/i18n'
const localVue = createLocalVue()
const i18n = new MEDigiI18n().setup(localVue)
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
localVue.component('font-awesome-icon', FontAwesomeIcon)
// @ts-ignore: this name mapping is defined in jest config
import ViewerToolbar from '@/components/ViewerToolbar.vue'

describe('ViewerToolbar.vue', () => {
    const toolbar = shallowMount(ViewerToolbar, {
        localVue, i18n,
        stubs: ['font-awesome-icon'],
    })
    // Check that component is mounted
    it('should mount the component', () => {
        expect(toolbar).toBeDefined()
    })
})
