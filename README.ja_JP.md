[English](README.md) | **日本語**

Nunjucksを静的HTMLとして扱うViteのプラグインです。Viteの詳しい処理が分かっていないので怪しい部分があると思います。

https://github.com/macropygia/static-site-stack/tree/main/packages/vite-plugin-pug-static を参考に作成しました。ありがとうございます。

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
- `buildOptions` : `object` ビルド時のオプション。
  - `envOptions` : `object` [Nunjucks Environment クラス](https://mozilla.github.io/nunjucks/api.html#environment)のopts。
  - `manageEnv(env, paths)` : `function` **env**はEnvironmentインスタンスなのでaddFilterなどの実装が可能。
  - `renderOptions` : `object`
      - `context(paths)` : `function` 変数や関数などをオブジェクトでまとめて返却するとNunjucksテンプレートから呼び出しが可能。
    - `callback(result, paths, err)` : `function` **result**にレンダリング結果が入っているので処理を追加したい場合はここに設定する。
- `serveOptions` : `object` 開発サーバ時のオプション。オプション詳細はbuildOptions同様。
- `ignorePattern` : `string | string[]` 開発サーバ時に変換から除外するパターン。ルート相対パスで指定。（ / から始まる）
- `reload` : `bool(true)` 開発サーバ時にフルリロードを行うか。
