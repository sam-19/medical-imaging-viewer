const path = require('path')
const { merge } = require('webpack-merge')
const common = require('./webpack.config.js')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const ASSET_PATH = process.env.ASSET_PATH || '/dist/'

module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-cheap-source-map',
    output: {
        path: path.resolve(__dirname, 'dist'),
        publicPath: ASSET_PATH,
        filename: 'dev-[name].js',
        chunkFilename: 'dev-[name].js?v=[contenthash]',
        libraryTarget: 'umd'
    },
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        compress: true,
        historyApiFallback: true,
        port: 8080,
        publicPath: '/',
    },
    performance: {
        hints: false
    },
    watchOptions: {
        ignored: /node_modules/
    },
    plugins: [
        new BundleAnalyzerPlugin()
    ]
})
