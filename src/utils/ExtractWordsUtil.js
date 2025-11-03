const addWord = (words, word) => {
    if (word) words.push(word)
}

export const getAllWordsInContent = content => {
    let used = {
        // Always include html and body.
        html: true,
        body: true
    }
    // Split on characters that are not valid in CSS identifier parts
    // CSS class names are composed of words separated by hyphens
    const words = content.split(/[^a-zA-Z0-9_]/g)
    for (let word of words) {
        if (word) { // Skip empty strings
            used[word.toLowerCase()] = true
        }
    }
    return used
}

export const getAllWordsInSelector = selector => {
    // Remove attr selectors. "a[href...]"" will become "a".
    selector = selector.replace(/\[(.+?)\]/g, "").toLowerCase()
    // If complex attr selector (has a bracket in it) just leave
    // the selector in. ¯\_(ツ)_/¯
    if (selector.includes("[") || selector.includes("]")) {
        return []
    }
    let skipNextWord = false,
        word = "",
        words = []

    for (let letter of selector) {
        if (skipNextWord && !(/[ #.]/).test(letter)) continue
        // If pseudoclass or universal selector, skip the next word
        if (/[:*]/.test(letter)) {
            addWord(words, word)
            word = ""
            skipNextWord = true
            continue
        }
        if (/[a-zA-Z0-9_]/.test(letter)) {
            word += letter
        } else if (letter === '-') {
            addWord(words, word)
            word = ""
        } else {
            addWord(words, word)
            word = ""
            skipNextWord = false
        }
    }

    addWord(words, word)
    return words
}
