/** MEDIGI VIEWER MAIN VIEWER COMPONENT TESTS
 * @package    medigi-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

// Jest doesn't handle vue component imports well
jest.mock('vue-fullscreen/src/component.vue', () => {})

import { shallowMount } from '@vue/test-utils'
// @ts-ignore: this name mapping is defined in jest config
import Viewer from '@/components/Viewer.vue'

describe('Viewer.vue', () => {
    const viewer = shallowMount(Viewer)
    // Check that component is mounted
    it('should mount the component', () => {
        expect(viewer).toBeDefined()
    })
})
