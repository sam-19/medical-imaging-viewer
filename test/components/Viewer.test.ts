/** MEDIGI VIEWER MAIN VIEWER COMPONENT TESTS
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

import { createLocalVue, shallowMount } from '@vue/test-utils'
import { MEDigiI18n } from '../../src/i18n'
const localVue = createLocalVue()
const i18n = new MEDigiI18n().setup(localVue)
// Jest doesn't handle vue component imports well
jest.mock('vue-fullscreen/src/component.vue', () => {})

// @ts-ignore: this name mapping is defined in jest config
import Viewer from '@/components/Viewer.vue'

describe('Viewer.vue', () => {
    const viewer = shallowMount(Viewer, {
        localVue, i18n,
        stubs: ['font-awesome-icon'],
    })
    // Check that component is mounted
    it('should mount the component', () => {
        expect(viewer).toBeDefined()
    })
})
