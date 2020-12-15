const { merge } = require('webpack-merge')
const common = require('./webpack.config.js')
var ClosurePlugin = require('closure-webpack-plugin')

module.exports = merge(common, {
    mode: 'production',
    devtool: 'source-map',
    optimization: {
        minimize: true,
        minimizer: [
            new ClosurePlugin({
                mode: 'STANDARD',
            }, {
                languageOut: 'ECMASCRIPT_2015',
            }),
        ],
        concatenateModules: false,
    },
})
