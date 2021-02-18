const path = require('path')
const { VueLoaderPlugin } = require('vue-loader')

const ASSET_PATH = process.env.ASSET_PATH || '/dist/'

module.exports = {
    entry: {
        main: { import: path.join(__dirname, 'src', 'index.ts') },
        /* These libraries will be very big if compiled independently
        'cornerstone-core': 'cornerstone-core',
        'cornerstone-math': 'cornerstone-math',
        'cornerstone-tools': 'cornerstone-tools',
        'plotly.js': 'plotly.js',
        */
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        publicPath: ASSET_PATH,
        filename: '[name].js',
        chunkFilename: '[name].js?v=[contenthash]',
        libraryTarget: 'umd'
    },
    module: {
        rules: [
            {
                test: /\.vue$/,
                loader: 'vue-loader',
            },
            {
                test: /\.css$/,
                oneOf: [
                    // Matches `<style module>`
                    {
                        resourceQuery: /module/,
                        use: [
                            'vue-style-loader',
                            {
                                loader: 'css-loader',
                                options: {
                                    modules: true,
                                    sourceMap: false
                                }
                            }
                        ]
                    },
                    // Matches `<style>` and `<style scoped>`
                    {
                        use: [
                            'vue-style-loader',
                            {
                                loader: 'css-loader',
                                options: {
                                    esModule: false
                                }
                            }
                        ]
                    }
                ]
            },
            {
                test: /\.html$/,
                loader: 'vue-template-loader'
            },
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                exclude: /node_modules/,
                options: {
                    appendTsSuffixTo: [/\.vue$/]
                }
            },
            {
                test: /\.(png|jpg|gif)$/,
                loader: 'file-loader',
                options: {
                    name: '[name].[ext]?[hash]'
                }
            },
            {
                test: /\.(eot|woff|woff2|ttf|svg)$/,
                loader: 'file-loader',
                options: {
                    name: '[path][name].[ext]?[hash]'
                }
            },
        ]
    },
    plugins: [
        new VueLoaderPlugin(),
    ],
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
    resolve: {
        extensions: ['.ts', '.js', '.vue', '.json'],
        alias: {
            'vue$': 'vue/dist/vue.esm.js'
        },
        fallback: {
            // Fixes can't resolve errors in plotly.js cornerstone-wado-image-loader
            assert: false,
            buffer: false,
            fs: false,
            path: false,
        }
    }
}
