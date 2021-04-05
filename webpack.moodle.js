const path = require('path')
const webpack = require('webpack')
const { merge } = require('webpack-merge')
const common = require('./webpack.config.js')

const ASSET_PATH = process.env.ASSET_PATH || '/dist/'

module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-cheap-source-map',
    output: {
        path: path.resolve(__dirname, 'dist'),
        publicPath: ASSET_PATH,
        filename: 'viewer.js',
        chunkFilename: '[name].js?v=[contenthash]',
        libraryTarget: 'amd'
    },
    externals: {
        'core/ajax': {
            amd: 'core/ajax'
        },
        'core/str': {
            amd: 'core/str'
        },
        'core/modal_factory': {
            amd: 'core/modal_factory'
        },
        'core/modal_events': {
            amd: 'core/modal_events'
        },
        'core/fragment': {
            amd: 'core/fragment'
        },
        'core/yui': {
            amd: 'core/yui'
        },
        'core/localstorage': {
            amd: 'core/localstorage'
        },
        'core/notification': {
            amd: 'core/notification'
        },
        'jquery': {
            amd: 'jquery'
        }
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery"
        }),
    ]
})
