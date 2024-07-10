import path from 'node:path';
import fse from 'fs-extra';
import {beforeAll, afterAll, describe, test, expect} from 'vitest';
import {build} from 'vite';
import {UserConfig} from 'vite';
import {Environment} from "nunjucks";
import nunjucksPlugin from '../src/index.js';
import type {NunjucksOptions, Paths} from "../src/render.js";

const srcdir: string = path.resolve(__dirname, 'src');
const distdir: string = path.resolve(__dirname, 'dist');

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

beforeAll(async () => {
  await build(config)
})

afterAll(async () => {
  await fse.remove(distdir)
})

describe('build', async () => {
  test('home', async () => {
    expect(await fse.readFile(path.join(distdir, 'index.html'), 'utf-8'))
      .toMatchInlineSnapshot(`
      "<!DOCTYPE html>
      <html>
      <head>
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
  });

  test('child', async () => {
    expect(await fse.readFile(path.join(distdir, 'child/index.html'), 'utf-8'))
      .toMatchInlineSnapshot(`
      "<!DOCTYPE html>
      <html>
      <head>
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
  });

})
