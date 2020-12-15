/**
 * MEDIGI IMAGING VIEWER VUEX STORE
 * @package    medigi-viewer
 * @copyright  2020 Sampsa Lohi
 * @license    MIT
 */

import { VueConstructor } from 'vue'
import Vuex, { CommitOptions, GetterTree, MutationTree, Store } from 'vuex'

// State defines store properties
const state = {
    appName: '' as string,
}
type State = typeof state
// Getters
type Getters = {
    getAppName(state: State): string,
}
const getters: GetterTree<State, State> & Getters = {
    getAppName: (state) => {
        return state.appName
    },
}
// Mutations (commits)
enum MutationTypes {
    SET_APP_NAME = 'SET_APP_NAME',
}
type Mutations<S = State> = {
    [MutationTypes.SET_APP_NAME] (state: S, payload: string): void,
}
const mutations: MutationTree<State> & Mutations = {
    [MutationTypes.SET_APP_NAME] (state, payload: string) {
        state.appName = payload
    },
}
// Actual type declaration of the store
type MDStore = Omit<
    Store<State>,
    'getters' | 'commit'
> & {
    commit<K extends keyof Mutations, P extends Parameters<Mutations[K]>[1]>(
        key: K,
        payload: P,
        options?: CommitOptions
        ): ReturnType<Mutations[K]>
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
            getters,
            mutations,
        })
        return store
    }
}

export { MEDigiStore, MutationTypes }
