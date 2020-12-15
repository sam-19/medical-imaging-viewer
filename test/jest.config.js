const path = require('path')

module.exports = {
    rootDir: path.resolve(__dirname, '../'),
    coverageDirectory: "<rootDir>/test/coverage/",
    globals: {
        "vue-jest": {
            "tsConfig": false,
        },
    },
    moduleFileExtensions: [
        "js",
        "ts",
        "json",
        "vue",
    ],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    modulePaths: [
        "<rootDir>/src/",
    ],
    roots: [
        "<rootDir>/test/",
    ],
    setupFiles: [
        "<rootDir>/test/jest.init.js",
    ],
    snapshotSerializers: [
        "jest-serializer-vue",
    ],
    transform: {
        "^.+\\.js$": "babel-jest",
        "^.+\\.ts$": "ts-jest",
        "^.+\\.vue$": "vue-jest",
    },
    transformIgnorePatterns: [
        "node_modules/(?!(@babel)/)",
    ],
    testRegex: "(test/.*|(\\.|/)(test|spec))\\.(tsx?)$",
    testURL: "http://localhost/",
}
