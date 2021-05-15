const path = require('path')
const { merge } = require('webpack-merge')
const common = require('./webpack.config.js')
const TerserPlugin = require('terser-webpack-plugin')

const ASSET_PATH = process.env.ASSET_PATH || '/'

module.exports = merge(common, {
    mode: 'production',
    devtool: 'source-map',
    output: {
        path: path.resolve(__dirname, 'build'),
        publicPath: ASSET_PATH,
        filename: '[name].min.js',
        chunkFilename: '[name].chunk.min.js',
        libraryTarget: 'umd'
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin(),
        ],
    },
})
