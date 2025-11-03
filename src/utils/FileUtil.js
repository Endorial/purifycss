import { minify } from "terser"
const fs = require("fs")
import glob from "glob"

const compressCode = (code, filename) => {
    // Only try to compress if it's definitely a JS file, or if no filename is provided (string content)
    if (filename && !filename.endsWith('.js')) {
        return code.toLowerCase()
    }

    try {
        // Try to minimize the code as much as possible, removing noise.
        const result = minify(code, {
            compress: {
                warnings: false
            },
            mangle: {
                toplevel: true
            }
        })
        code = result.code || code
    } catch (e) {
        // If compression fails, assume it's not valid JS and return the full code.
    }
    return code.toLowerCase()
}

export const concatFiles = (files, options) =>
    files.reduce((total, file) => {
        let code = ""
        try {
            code = fs.readFileSync(file, "utf8")
            code = options.compress ? compressCode(code, file) : code
        } catch (e) {
            console.warn(e.message)
        }
        return `${total}${code} `
    }, "")


export const getFilesFromPatternArray = fileArray => {
    let sourceFiles = {}
    for (let string of fileArray) {
        try {
            // See if string is a filepath, not a file pattern.
            fs.statSync(string)
            sourceFiles[string] = true
        } catch (e) {
            const files = glob.sync(string)
            files.forEach(file => {
                sourceFiles[file] = true
            })
        }
    }
    return Object.keys(sourceFiles)
}

export const filesToSource = (files, type) => {
    const isContent = type === "content"
    const options = { compress: isContent }
    if (Array.isArray(files)) {
        files = getFilesFromPatternArray(files)
        return concatFiles(files, options)
    }
    // 'files' is already a source string - don't compress but lowercase for consistency
    return isContent ? files.toLowerCase() : files
}

export default {
    concatFiles,
    filesToSource,
    getFilesFromPatternArray
}
