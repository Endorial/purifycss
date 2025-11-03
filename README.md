# PurifyCSS

[![npm version](https://img.shields.io/npm/v/purifycss.svg)](https://www.npmjs.com/package/purifycss)
[![npm downloads](https://img.shields.io/npm/dm/purifycss.svg)](https://www.npmjs.com/package/purifycss)
[![Node.js CI](https://github.com/purifycss/purifycss/actions/workflows/ci.yml/badge.svg)](https://github.com/purifycss/purifycss/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


A function that takes content (HTML/JS/PHP/etc) and CSS, and returns only the **used CSS**.
PurifyCSS does not modify the original CSS files. You can write to a new file, like minification.
If your application is using a CSS framework, this is especially useful as many selectors are often unused.

## Features

- **Smart Detection**: Detects CSS selectors in HTML, JavaScript, and other content files
- **Framework Friendly**: Perfect for removing unused CSS from frameworks like Bootstrap
- **Multiple Formats**: Supports glob patterns and file arrays
- **Modern Build**: ES modules and CommonJS support
- **CLI Tool**: Command-line interface for easy integration
- **Whitelist/Safelist**: Keep specific selectors even if unused

### Potential reduction

* [Bootstrap](https://github.com/twbs/bootstrap) file: ~140k
* App using ~40% of selectors.
* Minified: ~117k
* Purified + Minified: **~35k**


## Usage

### Standalone

Installation

```bash
npm i -D purifycss
```

```javascript
import purify from "purifycss"
// or
const purify = require("purifycss")

let content = ["src/**/*.html", "src/**/*.js"]
let css = ["src/**/*.css"]
let options = {
    output: "dist/purified.css"
}
purify(content, css, options)
```

### Build Time

- [Grunt](https://github.com/purifycss/grunt-purifycss)
- [Gulp](https://github.com/purifycss/gulp-purifycss)
- [Webpack](https://github.com/purifycss/purifycss-webpack-plugin)

### CLI Usage

```bash
npm install -g purifycss
```

```bash
purifycss --help

purifycss [options]

Options:
      --css        CSS files to purify                        [array] [required]
  -c, --content    Content files or globs to search for used selectors
                                                              [array] [required]
  -o, --out        Filepath to write purified CSS to                    [string]
  -m, --min        Minify CSS                         [boolean] [default: false]
  -i, --info       Logs info on how much CSS was removed
                                                      [boolean] [default: false]
  -r, --rejected   Logs the CSS rules that were removed
                                                      [boolean] [default: false]
  -w, --whitelist  List of selectors that should not be removed
                                                           [array] [default: []]
  -s, --safelist   Alias for --whitelist                   [array] [default: []]
  -h, --help       Show help                                           [boolean]
  -v, --version    Show version number                                 [boolean]
```


## How it works

### Used selector detection

Statically analyzes your code to pick up which selectors are used.  
But will it catch all of the cases?  

#### Let's start off simple.
#### Detecting the use of: `button-active`

``` html
  <!-- html -->
  <!-- class directly on element -->
  <div class="button-active">click</div>
```

``` javascript
  // javascript
  // Anytime your class name is together in your files, it will find it.
  $(button).addClass('button-active');
```

#### Now let's get crazy.
#### Detecting the use of: `button-active`

``` javascript
  // Can detect if class is split.
  var half = 'button-';
  $(button).addClass(half + 'active');

  // Can detect if class is joined.
  var dynamicClass = ['button', 'active'].join('-');
  $(button).addClass(dynamicClass);

  // Can detect various more ways, including all Javascript frameworks.
  // A React example.
  var classes = classNames({
    'button-active': this.state.buttonActive
  });

  return (
    <button className={classes}>Submit</button>;
  );
```

### Examples


##### Example with source strings

```js
var content = '<button class="button-active"> Login </button>';
var css = '.button-active { color: green; }   .unused-class { display: block; }';

console.log(purify(content, css));
```

logs out:

```
.button-active { color: green; }
```


##### Example with [glob](https://github.com/isaacs/node-glob) file patterns + writing to a file

```js
var content = ['**/src/js/*.js', '**/src/html/*.html'];
var css = ['**/src/css/*.css'];

var options = {
  // Will write purified CSS to this file.
  output: './dist/purified.css'
};

purify(content, css, options);
```


##### Example with both [glob](https://github.com/isaacs/node-glob) file patterns and source strings + minify + logging rejected selectors

```js
var content = ['**/src/js/*.js', '**/src/html/*.html'];
var css = '.button-active { color: green; } .unused-class { display: block; }';

var options = {
  output: './dist/purified.css',

  // Will minify CSS code in addition to purify.
  minify: true,

  // Logs out removed selectors.
  rejected: true
};

purify(content, css, options);
```
logs out:

```
.unused-class
```


##### Example with callback

```js
var content = ['**/src/js/*.js', '**/src/html/*.html'];
var css = ['**/src/css/*.css'];

purify(content, css, function (purifiedResult) {
  console.log(purifiedResult);
});
```


##### Example with callback + options

```js
var content = ['**/src/js/*.js', '**/src/html/*.html'];
var css = ['**/src/css/*.css'];

var options = {
  minify: true
};

purify(content, css, options, function (purifiedAndMinifiedResult) {
  console.log(purifiedAndMinifiedResult);
});
```

### API in depth

```javascript
// Four possible arguments.
purify(content, css, options, callback);
```

#####  The `content` argument
##### Type: `Array` or `String`

**`Array`** of [glob](https://github.com/isaacs/node-glob) file patterns to the files to search through for used classes (HTML, JS, PHP, ERB, Templates, anything that uses CSS selectors).

**`String`** of content to look at for used classes.

<br />

##### The `css` argument
##### Type: `Array` or `String`

**`Array`** of [glob](https://github.com/isaacs/node-glob) file patterns to the CSS files you want to filter.

**`String`** of CSS to purify.

<br />

##### The (optional) `options` argument
##### Type: `Object`

##### Properties of options object:

* **`minify:`** Set to `true` to minify. Default: `false`.

* **`output:`** Filepath to write purified CSS to. Returns raw string if `false`. Default: `false`.

* **`info:`** Logs info on how much CSS was removed if `true`. Default: `false`.

* **`rejected:`** Logs the CSS rules that were removed if `true`. Default: `false`.

* **`whitelist`** Array of selectors to always leave in. Ex. `['button-active', '*modal*']` this will leave any selector that includes `modal` in it and selectors that match `button-active`. (wrapping the string with *'s, leaves all selectors that include it)



##### The (optional) ```callback``` argument
##### Type: `Function`

A function that will receive the purified CSS as it's argument.

##### Example of callback use
``` javascript
purify(content, css, options, function(purifiedCSS){
  console.log(purifiedCSS, ' is the result of purify');
});
```

##### Example of callback without options
``` javascript
purify(content, css, function(purifiedCSS){
  console.log('callback without options and received', purifiedCSS);
});
```

##### Example CLI Usage

```bash
purifycss --css src/css/*.css --content src/js/*.js src/index.html --min --info --out dist/purified.css
```

This will purify all CSS files in `src/css/` by looking at selectors used in JavaScript files and `index.html`, then write the minified result to `dist/purified.css`.

The `--info` flag will print:
```
________________________________________________
|
|   PurifyCSS has reduced the file size by ~ 33.8%
|
________________________________________________
```

## What's New in v2.0

This version includes significant improvements and modernizations:

- **Updated Dependencies**: All dependencies updated to latest versions with security fixes
- **Modern Build System**: Migrated to Rollup with ES modules support
- **Improved CLI**: Better argument parsing, error handling, and glob pattern support
- **Enhanced Word Detection**: Better handling of CSS identifiers with numbers, underscores, and hyphens
- **Package Name**: Simplified to `purifycss` (was `purify-css`)
- **Safelist Support**: Added `--safelist` as an alias for `--whitelist`

### API in depth
