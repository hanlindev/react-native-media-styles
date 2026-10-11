import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdtempSync, writeFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
let npm: string | undefined;
try {
  npm = require.resolve('npm/bin/npm-cli.js');
} catch {
  npm = [
    dirname(process.execPath),
    ...(process.env.PATH ?? '').split(delimiter),
  ]
    .flatMap((dir) => [
      join(dir, 'node_modules/npm/bin/npm-cli.js'),
      join(dir, '../lib/node_modules/npm/bin/npm-cli.js'),
    ])
    .find((path) => existsSync(path));
}
if (!npm) throw new Error('npm is required for isolated installation checks');
const directory = mkdtempSync(join(tmpdir(), 'rnms-install-'));
function run(args: string[], cwd = directory) {
  const result = spawnSync(process.execPath, [npm!, ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout;
}
const dependencies: Record<string, string> = {
  react: '19.3.0',
  'react-dom': '19.3.0',
  'react-native-web': '0.21.4',
  '@babel/core': '7.29.7',
  esbuild: '0.25.12',
};
const packageNames: Record<string, string> = {
  core: '@react-native-media-styles/core',
  metro: 'react-native-web-streaming-styles',
  'babel-plugin': '@react-native-media-styles/babel-plugin',
};
for (const pkg of Object.keys(packageNames)) {
  const cwd = fileURLToPath(new URL(`../packages/${pkg}/`, import.meta.url));
  const packed: {filename: string}[] = JSON.parse(
    run(
      ['pack', '--json', '--ignore-scripts', '--pack-destination', directory],
      cwd,
    ),
  );
  dependencies[packageNames[pkg]] =
    `file:${join(directory, packed[0].filename).replaceAll('\\', '/')}`;
}
writeFileSync(
  join(directory, 'package.json'),
  JSON.stringify({name: 'rnms-install-check', private: true, dependencies}),
);
// Web consumes core through a bundler; native is an omitted peer in this small
// fixture. The demo checks actual Metro and native exports separately.
run(['install', '--omit=peer', '--no-audit', '--no-fund']);
writeFileSync(
  join(directory, 'check.cjs'),
  `
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const esbuild = require('esbuild');
for (const pkg of ['@react-native-media-styles/core', 'react-native-web-streaming-styles', '@react-native-media-styles/babel-plugin']) {
  assert.ok(fs.realpathSync(require.resolve(pkg)).startsWith(fs.realpathSync(__dirname) + path.sep));
}
const {withStreamingStyles} = require('react-native-web-streaming-styles');
const original = require.resolve('react-native-web/dist/exports/createElement');
const config = withStreamingStyles({resolver: {resolveRequest: (_context, name) => ({type: 'sourceFile', filePath: require.resolve(name)})}});
const factory = config.resolver.resolveRequest({originModulePath: require.resolve('react-native-web/dist/exports/View')}, 'react-native-web/dist/exports/createElement', 'web').filePath;
assert.ok(fs.realpathSync(factory).startsWith(fs.realpathSync(__dirname) + path.sep));
const ordered = config.resolver.resolveRequest({}, 'react-native-web/dist/exports/StyleSheet/dom/createOrderedCSSStyleSheet', 'web').filePath;
assert.ok(fs.realpathSync(ordered).startsWith(fs.realpathSync(__dirname) + path.sep));
const source = \`
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {breakpoints, useBreakpointStyle} from '@react-native-media-styles/core';
const token = breakpoints({base: {paddingLeft: 13}});
function Card() {
  const style = useBreakpointStyle(token);
  return <div className={Object.values(style).filter(v => typeof v === 'string').join(' ')}>packed</div>;
}
export const html = renderToStaticMarkup(<Card/>);
\`;
const transformed = babel.transformSync(source, {configFile: false, babelrc: false, parserOpts: {plugins: ['jsx']}, plugins: ['@react-native-media-styles/babel-plugin']}).code;
fs.writeFileSync('entry.jsx', transformed);
esbuild.buildSync({entryPoints: ['entry.jsx'], outfile: 'bundle.cjs', bundle: true, platform: 'node', format: 'cjs', resolveExtensions: ['.web.ts', '.ts', '.tsx', '.js'], external: ['react', 'react-dom/server']});
const {html} = require('./bundle.cjs');
assert.match(html, /padding-left:13px/);
assert.match(html, /data-precedence="react-native-media-styles"/);
assert.match(html, />packed<\\/div>/);
fs.writeFileSync('adapter.jsx', [
  'import React from "react";',
  'import {renderToStaticMarkup} from "react-dom/server";',
  'import createSheet from ' + JSON.stringify(ordered) + ';',
  'import createElement from ' + JSON.stringify(factory) + ';',
  'const sheet = createSheet(null);',
  'sheet.insert(".r-packed{height:23px;}", 3);',
  'export const html = renderToStaticMarkup(createElement("div", {dir:"rtl", style:{$$css:true,height:"r-packed"}, children:"adapter"}));',
].join('\\n'));
esbuild.buildSync({entryPoints:['adapter.jsx'], outfile:'adapter.cjs', bundle:true, platform:'node', format:'cjs', external:['react','react-dom/server'], alias:{
  'react-native-web-streaming-styles/original-create-element': original,
  'react-native-web-streaming-styles/original-ordered-sheet': config.resolver.resolveRequest({}, 'react-native-web-streaming-styles/original-ordered-sheet', 'web').filePath,
}});
const adapterHTML = require('./adapter.cjs').html;
assert.match(adapterHTML, /\\.r-packed\\.r-packed\\{height:23px;/);
assert.match(adapterHTML, /data-precedence="rnms-expo-rnw-3"/);
assert.match(adapterHTML, />adapter<\\/div>/);
console.log('Isolated tarball install, Babel transform, web bundle, SSR resources and Metro adapter verified.');
`,
);
const checked = spawnSync(process.execPath, ['check.cjs'], {
  cwd: directory,
  encoding: 'utf8',
});
assert.equal(checked.status, 0, checked.stderr || checked.stdout);
console.log(checked.stdout.trim());
console.log(`Consumer retained at ${directory}`);
