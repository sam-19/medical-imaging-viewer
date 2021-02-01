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
    activeItems: [] as string[],
    activeTool: null as null | string,
    appName: '' as string,
    cacheStatus: { count: 0, max: 0, size: 0 },
    linkedItems: [] as string[],
    linkedScrollPosition: 0,
}
type State = typeof state
// Getters
type Getters = {
    linkedItemIds (state: State): string[],
}
const getters: GetterTree<State, State> & Getters = {
    linkedItemIds: (state) => {
        // Resource id is the last of dash-delimited fields in the element id
        return state.linkedItems.map((el: any) => el.id.split('-').pop())
    },
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
    ADD_ACTIVE_ITEM = 'add-active-item',
    ADD_LINKED_ITEM = 'add-linked-item',
    REMOVE_ACTIVE_ITEM = 'remove-active-item',
    REMOVE_LINKED_ITEM = 'remove-linked-item',
    SET_ACTIVE_ITEMS = 'set-active-items',
    SET_ACTIVE_TOOL = 'set-active-tool',
    SET_APP_NAME = 'set-app-name',
    SET_CACHE_STATUS = 'set-cache-status',
    SET_LINKED_SCROLL_POSITION = 'set-linked-scroll-position',
}
type Mutations<S = State> = {
    [MutationTypes.ADD_ACTIVE_ITEM] (state: S, payload: string): void,
    [MutationTypes.ADD_LINKED_ITEM] (state: S, payload: string): void,
    [MutationTypes.REMOVE_ACTIVE_ITEM] (state: S, payload: any): void,
    [MutationTypes.REMOVE_LINKED_ITEM] (state: S, payload: any): void,
    [MutationTypes.SET_ACTIVE_ITEMS] (state: S, payload: string |string[]): void,
    [MutationTypes.SET_ACTIVE_TOOL] (state: S, payload: string): void,
    [MutationTypes.SET_APP_NAME] (state: S, payload: string): void,
    [MutationTypes.SET_CACHE_STATUS] (state: S, payload: object): void,
    [MutationTypes.SET_LINKED_SCROLL_POSITION] (state: S, payload: { origin: string, position: number }): void,
}
const mutations: MutationTree<State> & Mutations = {
    [MutationTypes.ADD_ACTIVE_ITEM] (state, payload: string) {
        if (state.activeItems.indexOf(payload) === -1) {
            state.activeItems.push(payload)
        }
    },
    [MutationTypes.ADD_LINKED_ITEM] (state, payload: any) {
        if (state.linkedItems.indexOf(payload) === -1) {
            state.linkedItems.push(payload)
        }
    },
    [MutationTypes.REMOVE_ACTIVE_ITEM] (state, payload: string) {
        if (state.activeItems.indexOf(payload) !== -1) {
            state.activeItems.splice(
                state.activeItems.indexOf(payload), 1
            )
        }
    },
    [MutationTypes.REMOVE_LINKED_ITEM] (state, payload: any) {
        if (state.linkedItems.indexOf(payload) !== -1) {
            state.linkedItems.splice(
                state.linkedItems.indexOf(payload), 1
            )
        }
    },
    [MutationTypes.SET_ACTIVE_ITEMS] (state, payload: string | string[]) {
        if (Array.isArray(payload)) {
            state.activeItems = payload
        } else {
            state.activeItems = [payload]
        }
    },
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
