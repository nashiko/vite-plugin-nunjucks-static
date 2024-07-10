import * as path from 'node:path';
import {FileSystemLoader, Environment, ILoader} from 'nunjucks';

export type Paths = {
  relative: string;
  absolute: string;
};

export type NunjucksOptions = {
  searchPaths?: string | string[];
  envOptions?: object;
  loader?: ILoader;
  manageEnv?: (env: Environment, paths: Paths) => void;
  renderOptions?: {
    context?: object | ((paths: Paths) => object);
    callback?: (result: string, paths: Paths, err: any) => string;
  };
};


export async function render(baseDir: string, filePath: string, options: NunjucksOptions): Promise<string | null> {
  const loader: ILoader = options.loader ? options.loader : new FileSystemLoader(options.searchPaths);
  const environment: Environment = new Environment(loader, options.envOptions);
  const paths: Paths = {
    absolute: filePath,
    relative: path.relative(baseDir, filePath).replace(/\\/g, '/')
  };

  if (typeof options.manageEnv === 'function') {
    options.manageEnv.call(null, environment, paths);
  }

  let context: object | ((paths: Paths) => object) | undefined = options.renderOptions?.context;
  if (typeof context === 'function') {
    context = (context as (paths: Paths) => object)(paths);
  } else {
    context = {};
  }

  return await new Promise<string | null>((resolve, reject) => {
    environment.render(filePath, context, (err, res) => {
      if (err) {
        reject(err);
      } else {
        let result: string = res || '';
        if (options.renderOptions?.callback) {
          result = options.renderOptions.callback(result, paths, err);
        }
        resolve(result);
      }
    });
  });
}
