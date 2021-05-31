/**
 * MEDIGI IMAGING VIEWER VUEX STORE
 * @package    medigi-viewer
 * @copyright  2020-2021 Sampsa Lohi
 * @license    MIT
 */

import { VueConstructor } from 'vue'
import Vuex, { ActionTree, ActionContext, CommitOptions, DispatchOptions, GetterTree, MutationTree, Store } from 'vuex'

// State defines store properties
type State = {
    activeTool: null | string,
    appName: string,
    cacheStatus: { count: number, max: number, size: number },
    linkedScrollPosition: number,
    // App settings
    SETTINGS: {
        locale: string,
        scopePriority: string[],
        screenPPI: number,
        eeg: {
            bottomBorder: {
                color: string,
                width: number,
            },
            channelSpacing: number,
            groupSpacing: number,
            isoelLine: {
                show: boolean,
                color: string,
                style: string,
                width: number,
            },
            leftBorder: {
                color: string,
                width: number,
            },
            majorGrid: {
                show: boolean,
                color: string,
                style: string,
                width: number,
            },
            minorGrid: {
                show: boolean,
                color: string,
                style: string,
                width: number,
            },
            traceColor: {
                eeg: string,
                ekg: string,
                eog: string,
            }
            setups: string[],
            traceWidth: {
                eeg: number,
                ekg: number,
                eog: number,
            }
            yPadding: number,
        },
        ekg: {
            showRuler: boolean,
        },
    },
}
// Getters
type Getters = {
}
const getters: GetterTree<State, State> & Getters = {
}
// Actions (method calls)
enum ActionTypes {
    IMAGE_FLIP_HORIZONTALLY = 'image:flip-horizontally',
    IMAGE_FLIP_VERTICALLY = 'image:flip-vertically',
    IMAGE_INVERT_COLORS = 'image:invert-colors',
    IMAGE_LINK_STACKS = 'image:link-stacks',
    IMAGE_RESTORE_DEFAULT_SETTINGS = 'image:restore-default-settings',
    IMAGE_ROTATE_BY = 'image:rotate-by',
    SETTINGS_CLOSED = 'settings:closed',
    TOOLS_REENABLE_ACTIVE = 'tools:re-enable-active',
}
type Actions = {
    [ActionTypes.IMAGE_FLIP_HORIZONTALLY] (): void,
    [ActionTypes.IMAGE_FLIP_VERTICALLY] (): void,
    [ActionTypes.IMAGE_INVERT_COLORS] (): void,
    [ActionTypes.IMAGE_LINK_STACKS] (value: boolean): void,
    [ActionTypes.IMAGE_RESTORE_DEFAULT_SETTINGS] (): void,
    [ActionTypes.IMAGE_ROTATE_BY] (angle: number): void,
    [ActionTypes.SETTINGS_CLOSED] (): void,
    [ActionTypes.TOOLS_REENABLE_ACTIVE] (): void,
}
const actions = {
    [ActionTypes.IMAGE_FLIP_HORIZONTALLY]() {},
    [ActionTypes.IMAGE_FLIP_VERTICALLY]() {},
    [ActionTypes.IMAGE_INVERT_COLORS]() {},
    [ActionTypes.IMAGE_LINK_STACKS]() {},
    [ActionTypes.IMAGE_RESTORE_DEFAULT_SETTINGS]() {},
    [ActionTypes.IMAGE_ROTATE_BY]() {},
    [ActionTypes.SETTINGS_CLOSED]() {},
    [ActionTypes.TOOLS_REENABLE_ACTIVE]() {},
}
// Mutations (commits)
enum MutationTypes {
    SET_ACTIVE_TOOL = 'set-active-tool',
    SET_APP_NAME = 'set-app-name',
    SET_CACHE_STATUS = 'set-cache-status',
    SET_LINKED_SCROLL_POSITION = 'set-linked-scroll-position',
    SET_SETTINGS_VALUE = 'set-settings-value',
}
type Mutations<S = State> = {
    [MutationTypes.SET_ACTIVE_TOOL] (state: S, payload: string): void,
    [MutationTypes.SET_APP_NAME] (state: S, payload: string): void,
    [MutationTypes.SET_CACHE_STATUS] (state: S, payload: object): void,
    [MutationTypes.SET_LINKED_SCROLL_POSITION] (state: S, payload: { origin: string, position: number }): void,
    [MutationTypes.SET_SETTINGS_VALUE] (state: S, payload: { field: string, value: string | number }): void,
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
    [MutationTypes.SET_SETTINGS_VALUE] (state, payload: { field: string, value: number|string }) {
        // Traverse fields "path" to reach target
        const fPath = payload.field.split('.')
        let field = state.SETTINGS as any
        let i = 0
        for (const f of fPath) {
            if (i === fPath.length - 1) {
                // Final field
                field[f as keyof typeof field] = payload.value
            } else {
                field = field[f as keyof typeof field]
            }
            i++
        }
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
    constructor () {

    }
    setup = function (vueInstance: VueConstructor) {
        vueInstance.use(Vuex)
        // Check if we have locally saved settings
        const localSettings = JSON.parse(window.localStorage.getItem('medigiViewerSettings') || '{}')
        // Create a local state to keep multiple instances isolated
        const state: State = {
            activeTool: null as null | string,
            appName: '' as string,
            cacheStatus: { count: 0, max: 0, size: 0 },
            linkedScrollPosition: 0,
            SETTINGS: {
                locale: localSettings.locale || 'en',
                scopePriority: ['radiology', 'ekg', 'eeg'],
                screenPPI: localSettings.screenPPI || 96,
                eeg: {
                    // Setups to load
                    setups: [
                        'default-10-20',
                    ],
                    // Display settings
                    channelSpacing: 1,
                    groupSpacing: 1,
                    bottomBorder: {
                        color: '#C0C0C0',
                        width: 1,
                    },
                    leftBorder: {
                        color: '#C0C0C0',
                        width: 1,
                    },
                    isoelLine: {
                        show: false,
                        color: '#F0F0F0',
                        style: 'solid',
                        width: 1,
                    },
                    majorGrid: {
                        show: true,
                        color: '#C0C0C0',
                        style: 'solid',
                        width: 1,
                    },
                    minorGrid: {
                        show: true,
                        color: '#F0F0F0',
                        style: 'solid',
                        width: 1,
                    },
                    traceColor: {
                        eeg: '#000000',
                        ekg: '#000000',
                        eog: '#000000',
                    },
                    traceWidth: {
                        eeg: 1,
                        ekg: 1,
                        eog: 1,
                    },
                    yPadding: 1,
                },
                ekg: {
                    showRuler: false,
                },
            },
        }
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
