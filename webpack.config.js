const path = require('path')
const { VueLoaderPlugin } = require('vue-loader')

const ASSET_PATH = process.env.ASSET_PATH || '/dist/'

module.exports = {
    entry: {
        main: path.join(__dirname, 'src', 'index.ts'),
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
    externals: {
    },
    plugins: [
        new VueLoaderPlugin(),
    ],
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        compress: true,
        port: 8080,
        historyApiFallback: true,
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
            // Fixes can't resolve errors in cornerstone-wado-image-loader
            fs: false,
            path: false,
        }
    }
}
