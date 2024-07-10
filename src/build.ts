import * as fs from 'node:fs';
import * as path from 'node:path';
import {Plugin, ResolvedConfig} from 'vite';
import {render, NunjucksOptions} from './render.js';

type BuildSettings = {
  options?: NunjucksOptions | undefined
}

const defaultOptions: NunjucksOptions = {
  searchPaths: '.',
  envOptions: {
    watch: false
  }
};

export const vitePluginNunjucksBuild = (settings: BuildSettings | undefined): Plugin => {
  const options: NunjucksOptions = {...defaultOptions, ...settings?.options};
  const pathMap: Map<string, string> = new Map<string, string>();
  let baseDir: string;

  return {
    name: 'vite-plugin-nunjucks-build',
    apply: 'build',
    enforce: 'pre',
    configResolved(config: ResolvedConfig): void {
      baseDir = path.resolve(config.root);
    },
    resolveId(source: string){
      if (source.endsWith('.njk')) {
        const parsedPath: path.ParsedPath = path.parse(source);
        const pathAsHtml: string = path.format({
          dir: parsedPath.dir,
          name: parsedPath.name,
          ext: '.html',
        });
        pathMap.set(pathAsHtml, source);
        return pathAsHtml;
      }
      return null;
    },
    async load(id: string) {
      if (path.extname(id) === '.html') {
        const filePath: string | undefined = pathMap.get(id);
        if (filePath) {
          try {
            return await render(baseDir, filePath, options);
          } catch (err) {
            throw err;
          }
        }

        return fs.readFileSync(id, 'utf-8');
      }

      return null;
    }
  };
};
