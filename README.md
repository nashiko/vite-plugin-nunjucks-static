**English** | [日本語](README.ja_JP.md)

This is a Vite plugin that treats Nunjucks as static HTML. Since I am not fully familiar with Vite detailed processing, there may be some uncertain parts.

Created with reference to https://github.com/macropygia/static-site-stack/tree/main/packages/vite-plugin-pug-static. Thank you.

# Install
```
npm install @nashiko/vite-plugin-nunjucks-static
```

# Usage

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vitePluginNunjucksStatic from '@nashiko/vite-plugin-nunjucks-static'

const nunjucksOptions = {
  manageEnv(env, paths) {
    env.addFilter('hello', (str) => {
      return `Hello ${str}`
    })
  },
  renderOptions: {
    context(paths) {
      return {
        testVal: 'VAL',
        testFn: (str) => {
          return str;
        },
      }
    }
  }
}

export default defineConfig({
  root: 'src',
  build: {
    rollupOptions: {
      input: {
        home: 'src/index.njk'
      }
    }
  },
  plugins: [
    vitePluginNunjucksStatic ({
      buildOptions: nunjucksOptions,
      serveOptions: nunjucksOptions,
      ignorePattern: ['/ignore/**'],
      reload: true
    })
  ]
})
```

# Options
- `buildOptions` : `object` Options for build.
  - `envOptions` : `object` Options for [Nunjucks Environment class](https://mozilla.github.io/nunjucks/api.html#environment).
  - `manageEnv(env, paths)` : `function` **env** is an Environment instance, so you can implement addFilter and other methods.
  - `renderOptions` : `object`
      - `context(paths)` : `function` Return variables and functions in an object to call from Nunjucks templates.
    - `callback(result, paths, err)` : `function` Set this if you want to add processing to the rendering result in **result**.
- `serveOptions` : `object` Options for dev server. Details of the options are the same as buildOptions.
- `ignorePattern` : `string | string[]` Patterns to exclude from conversion on the dev server. Specify as root-relative paths (starting with /)
- `reload` : `bool(true)` Whether to perform a full reload on the dev server.
