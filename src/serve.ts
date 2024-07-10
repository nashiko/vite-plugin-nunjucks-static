import * as fs from 'node:fs';
import * as path from 'node:path';
import { URL } from 'node:url';
import type http from 'node:http';

import { Plugin, ViteDevServer, Connect, HmrContext, send } from 'vite';
import { parseDir } from 'nunjucks-graph';
import picomatch from 'picomatch';
import { render, NunjucksOptions } from './render.js';


/**
 * @param options Nunjucks options
 * @param ignorePattern - Ignore patterns for converting Nunjucks to HTML
 * @param reload - Reload settings (Currently, only enable/disable control)
 */
type ServeSettings = {
  options?: NunjucksOptions | undefined
  ignorePattern?: picomatch.Glob | undefined
  reload?: boolean | undefined
}

export type Middleware = (
  req: Connect.IncomingMessage,
  res: http.ServerResponse,
  next: Connect.NextFunction,
) => void | http.ServerResponse | Promise<void | http.ServerResponse>

const defaultOptions: NunjucksOptions = {
  searchPaths: '.',
  envOptions: {
    watch: false
  }
};

const flatten = (obj: any): string[] => {
  const flatArray: string[] = [];

  const recursiveFlatten = (value: any) => {
    if (Array.isArray(value)) {
      value.forEach(recursiveFlatten);
    } else if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach(recursiveFlatten);
    } else if (typeof value === 'string') {
      flatArray.push(value);
    }
  };

  recursiveFlatten(obj);
  return Array.from(new Set(flatArray));
};


const middleware = (settings: ServeSettings, server: ViteDevServer): Middleware => {
  const options:NunjucksOptions = {...defaultOptions, ...settings?.options};
  const {ignorePattern} = settings;
  const ignoreMatcher = ignorePattern ? picomatch(ignorePattern) : null;

  return async (req, res, next) => {
    if (
      !req.url ||
      req.url.startsWith('/@') || // Ignore @fs @vite @react-refresh etc...
      req.url.startsWith('/__inspect/') // Ignore vite-plugin-inspect
    ) {
      return next();
    }

    const url: string = new URL(req.url, 'relative:///').pathname;

    if (ignoreMatcher && ignoreMatcher(url)) return next();

    const reqAbsPath: string = path.posix.join(
      server.config.root,
      url,
      url.endsWith('/') ? 'index.html' : '',
    )

    const parsedReqAbsPath: path.ParsedPath = path.posix.parse(reqAbsPath);

    if (parsedReqAbsPath.ext !== '.html') return next();
    if (fs.existsSync(reqAbsPath)) return next();

    const nunjucksAbsPath: string = path.posix.format({
      dir: parsedReqAbsPath.dir,
      name: parsedReqAbsPath.name,
      ext: '.njk',
    });

    if (!fs.existsSync(nunjucksAbsPath)) return send(req, res, '404 Not Found', 'html', {});

    const compiledModule =
      (await server.moduleGraph.getModuleByUrl(url)) ||
      (await server.moduleGraph.ensureEntryFromUrl(url));

    // Init when created
    if (compiledModule.file !== nunjucksAbsPath) {
      if (compiledModule.file) server.moduleGraph.fileToModulesMap.delete(compiledModule.file);
      compiledModule.file = nunjucksAbsPath;
      server.moduleGraph.fileToModulesMap.set(nunjucksAbsPath, new Set([compiledModule]));
    }

    // If the module didn't be invalidated
    //if (compiledModule.transformResult) return next();

    const graph = parseDir(parsedReqAbsPath.dir).getSimpleIndex();
    if (graph[nunjucksAbsPath]) {
      const ancestors: string[] = flatten(graph[nunjucksAbsPath]);
      ancestors.forEach((ancestor) => {
        const ancestorModules = server.moduleGraph.getModulesByFile(ancestor);
        const ancestorModule =
          (ancestorModules && [...ancestorModules][0]) ||
          server.moduleGraph.createFileOnlyEntry(ancestor);
        ancestorModule.importers.add(compiledModule);
        compiledModule.importedModules.add(ancestorModule);
      });
    }

    try {
      const baseDir: string = path.resolve(server.config.root);
      const code: string | null = await render(baseDir, nunjucksAbsPath, options);
      compiledModule.transformResult = { code: code || '', map: null };

    } catch (err) {
      return next(err);
    }

    const transformResult = await server.transformRequest(url, {
      html: true,
    });

    if (transformResult) {
      const html = await server.transformIndexHtml(url, transformResult.code);
      return send(req, res, html, 'html', {});
    }

    // transformResult is null
    // or Error occurred but Nunjucks compiler doesn't return Error object
    return next(new Error('An unexpected error has occurred.'));
  };
};

export const vitePluginNunjucksServe = (settings: ServeSettings): Plugin => {
  return {
    name: 'vite-plugin-nunjucks-serve',
    apply: 'serve',
    enforce: 'pre',

    configureServer(server: ViteDevServer) {
      server.middlewares.use(middleware(settings, server));
    },
    handleHotUpdate(ctx: HmrContext) {
      const fileModules = ctx.server.moduleGraph.getModulesByFile(ctx.file);

      if (fileModules) {
        fileModules.forEach((fileModule: any) => {
          fileModule.importers.forEach((importer: any) => {
            if (importer.file && path.extname(importer.file) === '.njk') {
              ctx.server.moduleGraph.invalidateModule(importer);
            }
          });
        });
      }

      if (settings.reload !== false) {
        ctx.server.ws.send({ type: 'full-reload' });
      }

      return [];
    }
  };
};
