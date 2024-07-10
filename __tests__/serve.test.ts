import path from 'node:path';
import axios, {AxiosError} from 'axios';
import {beforeAll, afterAll, describe, test, expect} from 'vitest';
import {createServer, ViteDevServer} from 'vite';
import type {UserConfig} from 'vite';
import type {Environment} from "nunjucks";
import nunjucksPlugin from '../src/index.js';
import type {NunjucksOptions, Paths} from "../src/render.js";

const srcdir: string = path.resolve(__dirname, 'src')
const distdir: string = path.resolve(__dirname, 'dist')

const nunjucksOptions: NunjucksOptions = {
  manageEnv(env: Environment) {
    env.addFilter('hello', (str) => {
      return `Hello ${str}`
    });
  },
  renderOptions: {
    context(paths: Paths) {
      const relativeParentPath = () => {
        const slashCnt = paths.relative.split(/\/|\\/).length - 1;
        return slashCnt ? String('../').repeat(slashCnt) : './';
      };

      return {
        testVal: 'VAL',
        testFn: (str: string) => {
          return str
        },
        relativeFilePath: paths.relative.replace(/\\/g, '/').replace(/.njk$/, '.html'),
        relativeParentPath: relativeParentPath(),
        relativeUrl: (url: string) => {
          return relativeParentPath() + url.replace(/(^\/)/g, '');
        }
      };
    }
  }
}

const config: UserConfig = {
  root: srcdir,
  build: {
    outDir: distdir,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: '__tests__/src/index.njk',
        child: '__tests__/src/child/index.njk',
      }
    }
  },
  plugins: [
    nunjucksPlugin({
      buildOptions: nunjucksOptions,
      serveOptions: nunjucksOptions,
      ignorePattern: ['/ignore/**'],
      reload: true,
    })
  ]
}

let server: ViteDevServer

beforeAll(async () => {
  server = await createServer(config)
  await server.listen()
  // server.printUrls()
})

afterAll(async () => {
  server.close()
})

describe('serve', () => {
  test('get /', async () => {
    await axios.get('http://localhost:5173/').then((res) => {
      expect(res.data).toMatchInlineSnapshot(`
      "<!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="/@vite/client"></script>

      </head>
      <body>
      <ul>
        <li><a href="./">index</a></li>
        <li><a href="./child">child</a></li>
      </ul>
      
        <h1>INDEX</h1>
        <h2>Hello World</h2>
        <h3>VAL</h3>
        <h4>FN</h4>
      </body>
      </html>
      "
    `)
    })
  })

  test('get /child/', async () => {
    await axios.get('http://localhost:5173/child/').then((res) => {
      expect(res.data).toMatchInlineSnapshot(`
      "<!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="/@vite/client"></script>

      </head>
      <body>
      <ul>
        <li><a href="../">index</a></li>
        <li><a href="../child">child</a></li>
      </ul>
      
        <h1>CHILD</h1>
      </body>
      </html>
      "
    `)
    })
  })


  test('get /nothtml.jpg', async () => {
    await axios
      .get('http://localhost:5173/nothtml.jpg')
      .catch((err: unknown) => {
        if (err instanceof AxiosError) expect(err.response?.status).toBe(404)
      })
  })
  test('get /ignore/', async () => {
    await axios.get('http://localhost:5173/ignore/').catch((err: unknown) => {
      if (err instanceof AxiosError) expect(err.response?.status).toBe(404)
    })
  })
  test('get /notfound/', async () => {
    await axios.get('http://localhost:5173/notfound/').catch((err: unknown) => {
      if (err instanceof AxiosError) expect(err.response?.status).toBe(404)
    })
  })
  test('get /invalid/', async () => {
    await axios.get('http://localhost:5173/invalid/').catch((err: unknown) => {
      if (err instanceof AxiosError) expect(err.response?.status).toBe(500)
    })
  })
  test('get /__inspect/', async () => {
    await axios
      .get('http://localhost:5173/__inspect/')
      .catch((err: unknown) => {
        if (err instanceof AxiosError) expect(err.response?.status).toBe(404)
      })
  })
})
