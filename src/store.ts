/**
 * MEDIGI IMAGING VIEWER VUEX STORE
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

import { VueConstructor } from 'vue'
import Vuex, { ActionTree, ActionContext, CommitOptions, DispatchOptions, GetterTree, MutationTree, Store } from 'vuex'

// State defines store properties
const state = {
    activeTool: null as null | string,
    appName: '' as string,
    cacheStatus: { count: 0, max: 0, size: 0 },
    linkedScrollPosition: 0,
}
type State = typeof state
// Getters
type Getters = {
}
const getters: GetterTree<State, State> & Getters = {
}
// Actions (method calls)
enum ActionTypes {
    IMAGE_FLIP_HORIZONTALLY = 'image:flip-horizontally',
    IMAGE_INVERT_COLORS = 'image:invert-colors',
    IMAGE_LINK_STACKS = 'image:link-stacks',
    IMAGE_RESTORE_DEFAULT_SETTINGS = 'image:restore-default-settings',
    IMAGE_ROTATE_BY = 'image:rotate-by',
    TOOLS_REENABLE_ACTIVE = 'tools:re-enable-active',
}
type Actions = {
    [ActionTypes.IMAGE_FLIP_HORIZONTALLY] (): void,
    [ActionTypes.IMAGE_INVERT_COLORS] (): void,
    [ActionTypes.IMAGE_LINK_STACKS] (value: boolean): void,
    [ActionTypes.IMAGE_RESTORE_DEFAULT_SETTINGS] (): void,
    [ActionTypes.IMAGE_ROTATE_BY] (angle: number): void,
    [ActionTypes.TOOLS_REENABLE_ACTIVE] (): void,
}
const actions = {
    [ActionTypes.IMAGE_FLIP_HORIZONTALLY]() {},
    [ActionTypes.IMAGE_INVERT_COLORS]() {},
    [ActionTypes.IMAGE_LINK_STACKS]() {},
    [ActionTypes.IMAGE_RESTORE_DEFAULT_SETTINGS]() {},
    [ActionTypes.IMAGE_ROTATE_BY]() {},
    [ActionTypes.TOOLS_REENABLE_ACTIVE]() {},
}
// Mutations (commits)
enum MutationTypes {
    SET_ACTIVE_TOOL = 'set-active-tool',
    SET_APP_NAME = 'set-app-name',
    SET_CACHE_STATUS = 'set-cache-status',
    SET_LINKED_SCROLL_POSITION = 'set-linked-scroll-position',
}
type Mutations<S = State> = {
    [MutationTypes.SET_ACTIVE_TOOL] (state: S, payload: string): void,
    [MutationTypes.SET_APP_NAME] (state: S, payload: string): void,
    [MutationTypes.SET_CACHE_STATUS] (state: S, payload: object): void,
    [MutationTypes.SET_LINKED_SCROLL_POSITION] (state: S, payload: { origin: string, position: number }): void,
}
const mutations: MutationTree<State> & Mutations = {
    [MutationTypes.SET_ACTIVE_TOOL] (state, payload: string) {
        if (state.activeTool === payload) {
            state.activeTool = null
        } else {
            state.activeTool = payload
        }
    },
    [MutationTypes.SET_APP_NAME] (state, payload: string) {
        state.appName = payload
    },
    [MutationTypes.SET_CACHE_STATUS] (state, payload: any) {
        state.cacheStatus = {
            count: payload.numberOfImagesCached,
            max: payload.maximumSizeInBytes,
            size: payload.cacheSizeInBytes
        }
    },
    [MutationTypes.SET_LINKED_SCROLL_POSITION] (state, payload: { origin: string, position: number }) {
        state.linkedScrollPosition = payload.position
    },
}
// Actual type declaration of the store
type MDStore = Omit<
    Store<State>,
    'getters' | 'commit' | 'dispatch'
> & {
    commit<K extends keyof Mutations, P extends Parameters<Mutations[K]>[1]>(
        key: K,
        payload: P,
        options?: CommitOptions
    ): ReturnType<Mutations[K]>
    dispatch<K extends keyof Actions>(
        key: K,
        payload: Parameters<Actions[K]>[1],
        options?: DispatchOptions
    ): ReturnType<Actions[K]>
} & {
    getters: {
    [K in keyof Getters]: ReturnType<Getters[K]>
    }
}
// MEDigiStore class implementing the above
class MEDigiStore {
    setup = function (vueInstance: VueConstructor) {
        vueInstance.use(Vuex)
        const store: MDStore = new Store({
            state,
            actions,
            getters,
            mutations,
        })
        return store
    }
}

export { MEDigiStore, MutationTypes }
