const path = require('path')
const { VueLoaderPlugin } = require('vue-loader')

module.exports = {
    entry: {
        'medimg-eeg-signal-worker': { import: path.join(__dirname, 'src', 'assets', 'workers', 'EegSignalWorker.ts') },
        'medimg-viewer': { import: path.join(__dirname, 'src', 'index.ts') },
    },
    externals: {
        /* These libraries will be very big if compiled into the source */
        'vue': 'Vue',
        'fili': 'Fili',
        'plotly': 'Plotly',
        'hammerjs': 'Hammer',
        'dicom-parser': 'dicomParser',
        'cornerstone-core': 'cornerstone',
        'cornerstone-math': 'cornerstoneMath',
        'cornerstone-tools': 'cornerstoneTools',
        'cornerstone-wado-image-loader': 'cornerstoneWADOImageLoader',
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
        },
        symlinks: false
    }
}
