import babel from "@rollup/plugin-babel"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import terser from "@rollup/plugin-terser"

const config = {
    input: "src/purifycss.js",
    output: [
        {
            file: "lib/purifycss.es.js",
            format: "es"
        },
        {
            file: "lib/purifycss.js",
            format: "cjs"
        }
    ],
    plugins: [
        nodeResolve(),
        commonjs(),
        babel({
            exclude: "node_modules/**",
            presets: [
                ["@babel/preset-env", {
                    modules: false,
                    targets: {
                        node: "14"
                    }
                }]
            ]
        })
    ],
    external: ["clean-css", "glob", "rework", "terser", "yargs"]
}

export default config
