import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';

const require = createRequire(import.meta.url);
const [mode, size, adapter] = process.argv.slice(2);
if (!mode) {
  const results = [];
  for (const workload of ['stable', 'growing']) {
    for (const count of [100, 1000, 3000]) {
      for (const enabled of ['baseline', 'metro']) {
        const result = spawnSync(
          process.execPath,
          [fileURLToPath(import.meta.url), workload, String(count), enabled],
          {encoding: 'utf8', env: {...process.env, NODE_ENV: 'production'}},
        );
        if (result.status !== 0)
          throw new Error(result.stderr || result.stdout);
        results.push(JSON.parse(result.stdout));
      }
    }
  }
  // Keep the growing-sheet output regression enforceable in CI. The adapter
  // strengthens selectors, but should remain comparable to one RNW extraction.
  for (const result of results.filter((entry) => entry.adapter === 'metro')) {
    if (
      result.snapshotCalls !== 0 ||
      result.declaredResources > result.count * 20
    ) {
      throw new Error(
        `Repeated stylesheet work: ${result.mode}/${result.count}`,
      );
    }
    const baseline = results.find(
      (entry) =>
        entry.adapter === 'baseline' &&
        entry.mode === result.mode &&
        entry.count === result.count,
    );
    if (!baseline || result.emittedCssBytes > baseline.emittedCssBytes * 2) {
      throw new Error(
        `CSS output amplification: ${result.mode}/${result.count}`,
      );
    }
  }
  console.log(
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        description:
          'Fresh process per workload. Stable: 1000 pre-registered rules; growing: one new rule per element. Median of 5 renders; first render measured separately.',
        results,
      },
      null,
      2,
    ),
  );
} else {
  const React = require('react');
  const {renderToString} = require('react-dom/server');
  const orderedPath =
    require.resolve('react-native-web/dist/cjs/exports/StyleSheet/dom/createOrderedCSSStyleSheet');
  const originalOrdered = require(orderedPath);
  let original: any;
  const ts = require('typescript');
  let snapshots = 0;
  let snapshotMs = 0;
  let snapshotBytes = 0;
  let declarations = 0;
  let createdResources = 0;
  const modules = new Map<string, Record<string, any>>();
  function load(name: string): Record<string, any> {
    const cached = modules.get(name);
    if (cached) return cached;
    const source = readFileSync(
      new URL(`../../../packages/metro/src/${name}.ts`, import.meta.url),
      'utf8',
    );
    const code = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    const exports = {};
    modules.set(name, exports);
    new Function('exports', 'require', code)(exports, (id: string) => {
      if (id === 'react')
        return {
          ...React,
          createElement: (...args: any[]) => {
            if (args[0] === 'style') createdResources++;
            return React.createElement(...args);
          },
        };
      if (id.endsWith('/original-create-element'))
        return {default: original, __esModule: true};
      if (id.endsWith('/original-ordered-sheet'))
        return {default: originalOrdered, __esModule: true};
      if (id.startsWith('./')) return load(id.slice(2));
      return require(id);
    });
    return exports;
  }
  // Install the same ordered-sheet interception as Metro before RNW creates
  // its singleton sheet. Both adapter modules share one registry instance.
  if (adapter === 'metro')
    require.cache[orderedPath]!.exports = load('orderedSheet').default;
  const StyleSheet = require('react-native-web/dist/cjs/exports/StyleSheet');
  original = require('react-native-web/dist/cjs/exports/createElement');
  const getSheet = StyleSheet.getSheet;
  StyleSheet.getSheet = () => {
    const start = performance.now();
    const result = getSheet();
    snapshotMs += performance.now() - start;
    snapshots++;
    snapshotBytes += Buffer.byteLength(result.textContent);
    return result;
  };
  const factory =
    adapter === 'metro' ? load('createElement').default : original;
  const count = Number(size);
  const stable = Array.from(
    {length: 1000},
    (_, index) => StyleSheet.create({box: {width: index + 1}}).box,
  );
  function Row({index}: {index: number}) {
    const style =
      mode === 'stable'
        ? stable[index % stable.length]
        : StyleSheet.create({box: {height: index + 1}}).box;
    const element = factory('div', {style, children: 'row'});
    if (adapter === 'metro')
      declarations += element.props.children[0].props.children.length;
    return element;
  }
  const tree = React.createElement(
    'main',
    null,
    Array.from({length: count}, (_, index) =>
      React.createElement(Row, {key: index, index}),
    ),
  );
  const times: number[] = [];
  let first: Record<string, number> = {};
  for (let attempt = 0; attempt < 6; attempt++) {
    snapshots =
      snapshotBytes =
      snapshotMs =
      declarations =
      createdResources =
        0;
    const start = performance.now();
    let html = renderToString(tree);
    // A complete RNW SSR response extracts its sheet once after rendering.
    if (adapter === 'baseline') {
      const sheet = StyleSheet.getSheet();
      html = `<style id="${sheet.id}">${sheet.textContent}</style>${html}`;
    }
    if (mode === 'growing') {
      const css = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)]
        .map((match) => match[1])
        .join('');
      if ((css.match(/height:/g) ?? []).length !== count) {
        throw new Error(
          `Expected ${count} distinct height rules exactly once on render ${attempt}`,
        );
      }
    }
    const duration = performance.now() - start;
    if (attempt === 0) {
      const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)];
      first = {
        firstRenderMs: duration,
        snapshotMs,
        snapshotCalls: snapshots,
        snapshotBytes,
        declaredResources: declarations,
        createdResourceElements: createdResources,
        emittedStyleTags: styles.length,
        emittedResourceIdentities: styles.reduce(
          (count, match) =>
            count +
            (match[0].match(/data-href="([^"]*)"/)?.[1].split(' ').length ?? 0),
          0,
        ),
        emittedCssBytes: Buffer.byteLength(
          styles.map((match) => match[1]).join(''),
        ),
        htmlBytes: Buffer.byteLength(html),
        gzipBytes: gzipSync(html).length,
      };
    } else times.push(duration);
  }
  times.sort((a, b) => a - b);
  console.log(
    JSON.stringify({mode, count, adapter, ...first, warmMedianMs: times[2]}),
  );
}
