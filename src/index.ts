import {vitePluginNunjucksBuild} from './build.js';
import {vitePluginNunjucksServe} from './serve.js';
import type {NunjucksOptions} from './render.js';
import * as Picomatch from 'picomatch';

type Settings = {
  buildOptions?: NunjucksOptions
  serveOptions?: NunjucksOptions,
  ignorePattern?: Picomatch.Glob
  reload?: boolean
};

const defaultSettings: Settings = {};

export default (userSettings: Settings) => {
  const settings: Settings = {
    ...defaultSettings,
    ...userSettings,
  }

  return [
    vitePluginNunjucksBuild({
      options: settings.buildOptions,
    }),
    vitePluginNunjucksServe({
      options: settings.serveOptions,
      ignorePattern: settings.ignorePattern,
      reload: settings.reload,
    })
  ];
};
