import CleanCss from 'clean-css';
import { EventEmitter } from 'events';
import rework from 'rework';
import { minify as minify$1 } from 'terser';
import glob from 'glob';

const RULE_TYPE = "rule";
const MEDIA_TYPE = "media";
class CssTreeWalker extends EventEmitter {
  constructor(code, plugins) {
    super();
    this.startingSource = code;
    this.ast = null;
    plugins.forEach(plugin => {
      plugin.initialize(this);
    });
  }
  beginReading() {
    this.ast = rework(this.startingSource).use(this.readPlugin.bind(this));
  }
  readPlugin(tree) {
    this.readRules(tree.rules);
    this.removeEmptyRules(tree.rules);
  }
  readRules(rules) {
    for (let rule of rules) {
      if (rule.type === RULE_TYPE) {
        this.emit("readRule", rule.selectors, rule);
      }
      if (rule.type === MEDIA_TYPE) {
        this.readRules(rule.rules);
      }
    }
  }
  removeEmptyRules(rules) {
    let emptyRules = [];
    for (let rule of rules) {
      const ruleType = rule.type;
      if (ruleType === RULE_TYPE && rule.selectors.length === 0) {
        emptyRules.push(rule);
      }
      if (ruleType === MEDIA_TYPE) {
        this.removeEmptyRules(rule.rules);
        if (rule.rules.length === 0) {
          emptyRules.push(rule);
        }
      }
    }
    emptyRules.forEach(emptyRule => {
      const index = rules.indexOf(emptyRule);
      rules.splice(index, 1);
    });
  }
  toString() {
    if (this.ast) {
      return this.ast.toString().replace(/,\n/g, ",");
    }
    return "";
  }
}

const fs$1 = require("fs");
const compressCode = (code, filename) => {
  // Only try to compress if it's definitely a JS file, or if no filename is provided (string content)
  if (filename && !filename.endsWith('.js')) {
    return code.toLowerCase();
  }
  try {
    // Try to minimize the code as much as possible, removing noise.
    const result = minify$1(code, {
      compress: {
        warnings: false
      },
      mangle: {
        toplevel: true
      }
    });
    code = result.code || code;
  } catch (e) {
    // If compression fails, assume it's not valid JS and return the full code.
  }
  return code.toLowerCase();
};
const concatFiles = (files, options) => files.reduce((total, file) => {
  let code = "";
  try {
    code = fs$1.readFileSync(file, "utf8");
    code = options.compress ? compressCode(code, file) : code;
  } catch (e) {
    console.warn(e.message);
  }
  return `${total}${code} `;
}, "");
const getFilesFromPatternArray = fileArray => {
  let sourceFiles = {};
  for (let string of fileArray) {
    try {
      // See if string is a filepath, not a file pattern.
      fs$1.statSync(string);
      sourceFiles[string] = true;
    } catch (e) {
      const files = glob.sync(string);
      files.forEach(file => {
        sourceFiles[file] = true;
      });
    }
  }
  return Object.keys(sourceFiles);
};
const filesToSource = (files, type) => {
  const isContent = type === "content";
  const options = {
    compress: isContent
  };
  if (Array.isArray(files)) {
    files = getFilesFromPatternArray(files);
    return concatFiles(files, options);
  }
  // 'files' is already a source string - don't compress but lowercase for consistency
  return isContent ? files.toLowerCase() : files;
};
var FileUtil = {
  concatFiles,
  filesToSource,
  getFilesFromPatternArray
};

let beginningLength;
const printInfo = endingLength => {
  const sizeReduction = ((beginningLength - endingLength) / beginningLength * 100).toFixed(1);
  console.log(`
    ________________________________________________
    |
    |   PurifyCSS has reduced the file size by ~ ${sizeReduction}%  
    |
    ________________________________________________
    `);
};
const printRejected = rejectedTwigs => {
  console.log(`
    ________________________________________________
    |
    |   PurifyCSS - Rejected selectors:  
    |   ${rejectedTwigs.join("\n    |\t")}
    |
    ________________________________________________
    `);
};
const startLog = cssLength => {
  beginningLength = cssLength;
};
var PrintUtil = {
  printInfo,
  printRejected,
  startLog
};

const addWord = (words, word) => {
  if (word) words.push(word);
};
const getAllWordsInContent = content => {
  let used = {
    // Always include html and body.
    html: true,
    body: true
  };
  // Split on characters that are not valid in CSS identifier parts
  // CSS class names are composed of words separated by hyphens
  const words = content.split(/[^a-zA-Z0-9_]/g);
  for (let word of words) {
    if (word) {
      // Skip empty strings
      used[word.toLowerCase()] = true;
    }
  }
  return used;
};
const getAllWordsInSelector = selector => {
  // Remove attr selectors. "a[href...]"" will become "a".
  selector = selector.replace(/\[(.+?)\]/g, "").toLowerCase();
  // If complex attr selector (has a bracket in it) just leave
  // the selector in. ¯\_(ツ)_/¯
  if (selector.includes("[") || selector.includes("]")) {
    return [];
  }
  let skipNextWord = false,
    word = "",
    words = [];
  for (let letter of selector) {
    if (skipNextWord && !/[ #.]/.test(letter)) continue;
    // If pseudoclass or universal selector, skip the next word
    if (/[:*]/.test(letter)) {
      addWord(words, word);
      word = "";
      skipNextWord = true;
      continue;
    }
    if (/[a-zA-Z0-9_]/.test(letter)) {
      word += letter;
    } else if (letter === '-') {
      addWord(words, word);
      word = "";
    } else {
      addWord(words, word);
      word = "";
      skipNextWord = false;
    }
  }
  addWord(words, word);
  return words;
};

const isWildcardWhitelistSelector = selector => {
  return selector[0] === "*" && selector[selector.length - 1] === "*";
};
const hasWhitelistMatch = (selector, whitelist) => {
  for (let el of whitelist) {
    if (selector.includes(el)) return true;
  }
  return false;
};
class SelectorFilter {
  constructor(contentWords, whitelist) {
    this.contentWords = contentWords;
    this.rejectedSelectors = [];
    this.wildcardWhitelist = [];
    this.parseWhitelist(whitelist);
  }
  initialize(CssSyntaxTree) {
    CssSyntaxTree.on("readRule", this.parseRule.bind(this));
  }
  parseWhitelist(whitelist) {
    whitelist.forEach(whitelistSelector => {
      whitelistSelector = whitelistSelector.toLowerCase();
      if (isWildcardWhitelistSelector(whitelistSelector)) {
        // If '*button*' then push 'button' onto list.
        this.wildcardWhitelist.push(whitelistSelector.substr(1, whitelistSelector.length - 2));
      } else {
        getAllWordsInSelector(whitelistSelector).forEach(word => {
          this.contentWords[word] = true;
        });
      }
    });
  }
  parseRule(selectors, rule) {
    rule.selectors = this.filterSelectors(selectors);
  }
  filterSelectors(selectors) {
    let contentWords = this.contentWords,
      rejectedSelectors = this.rejectedSelectors,
      wildcardWhitelist = this.wildcardWhitelist,
      usedSelectors = [];
    selectors.forEach(selector => {
      if (hasWhitelistMatch(selector, wildcardWhitelist)) {
        usedSelectors.push(selector);
        return;
      }
      let words = getAllWordsInSelector(selector),
        usedWords = words.filter(word => contentWords[word]);
      if (usedWords.length === words.length) {
        usedSelectors.push(selector);
      } else {
        rejectedSelectors.push(selector);
      }
    });
    return usedSelectors;
  }
}

const fs = require("fs");
const OPTIONS = {
  output: false,
  minify: false,
  info: false,
  rejected: false,
  whitelist: [],
  cleanCssOptions: {}
};
const getOptions = (options = {}) => {
  let opt = {};
  for (let option in OPTIONS) {
    opt[option] = options[option] || OPTIONS[option];
  }
  return opt;
};
const minify = (cssSource, options) => new CleanCss(options).minify(cssSource).styles;
const purify = (searchThrough, css, options, callback) => {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  options = getOptions(options);
  let cssString = FileUtil.filesToSource(css, "css"),
    content = FileUtil.filesToSource(searchThrough, "content");
  PrintUtil.startLog(minify(cssString).length);
  let wordsInContent = getAllWordsInContent(content),
    selectorFilter = new SelectorFilter(wordsInContent, options.whitelist),
    tree = new CssTreeWalker(cssString, [selectorFilter]);
  tree.beginReading();
  let source = tree.toString();
  source = options.minify ? minify(source, options.cleanCssOptions) : source;

  // Option info = true
  if (options.info) {
    if (options.minify) {
      PrintUtil.printInfo(source.length);
    } else {
      PrintUtil.printInfo(minify(source, options.cleanCssOptions).length);
    }
  }

  // Option rejected = true
  if (options.rejected && selectorFilter.rejectedSelectors.length) {
    PrintUtil.printRejected(selectorFilter.rejectedSelectors);
  }
  if (options.output) {
    fs.writeFile(options.output, source, err => {
      if (err) return err;
    });
  } else {
    return callback ? callback(source) : source;
  }
};

export { purify as default };
