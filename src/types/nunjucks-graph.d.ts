declare module 'nunjucks-graph' {
  interface NunjucksGraphOptions {
    extensions?: string[];
  }

  interface NunjucksGraphIndex {
    parents: string[];
    children: string[];
  }

  class NunjucksGraph {
    constructor(options: NunjucksGraphOptions, dir: string);
    setDir(dirpath: string): void;
    addFile(file: string): void;
    getIndex(): object;
    getSimpleIndex(): { [key: string]: NunjucksGraphIndex };
  }

  export function parseDir(dirpath: string, options?: NunjucksGraphOptions): NunjucksGraph;
}
