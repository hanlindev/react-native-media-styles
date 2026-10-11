import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

// npm ships with Node. Calling its JS entry avoids shell-dependent npm.cmd quoting.
import {createRequire} from 'node:module';
import {dirname, join, delimiter} from 'node:path';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const require = createRequire(import.meta.url);
let npm;
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
if (!npm)
  throw new Error('npm is required to inspect the published package contents');
const names: Record<string, string> = {
  core: '@react-native-media-styles/core',
  metro: 'react-native-web-streaming-styles',
  'babel-plugin': '@react-native-media-styles/babel-plugin',
};
for (const pkg of Object.keys(names)) {
  const directory = fileURLToPath(
    new URL(`../packages/${pkg}/`, import.meta.url),
  );
  const result = spawnSync(
    process.execPath,
    [npm, 'pack', '--dry-run', '--json', '--ignore-scripts'],
    {encoding: 'utf8', cwd: directory},
  );
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const payload: {name: string; files: {path: string}[]}[] = JSON.parse(
    result.stdout,
  );
  const [{name, files}] = payload;
  assert.equal(name, names[pkg]);
  const paths = files.map((file) => file.path);
  if (pkg === 'core') {
    assert(paths.includes('src/BreakpointStyles.web.ts'));
    assert(paths.includes('src/BreakpointStyles.native.ts'));
  } else if (pkg === 'metro') {
    assert(paths.includes('dist/metro.cjs'));
    assert(paths.includes('dist/metro.d.cts'));
    assert(paths.includes('src/createElement.ts'));
    assert(paths.includes('src/orderedSheet.ts'));
    assert(paths.includes('src/registry.ts'));
  } else {
    assert(paths.includes('dist/index.cjs'));
    assert(paths.includes('dist/index.d.cts'));
  }
  assert(paths.includes('README.md'));
  assert(paths.includes('LICENSE'));
  assert(
    !paths.some((path) => /^(examples|docs|scripts)\//.test(path)),
    'Demo/tooling files must not be published',
  );
  assert(
    !paths.some((path: string) =>
      /\.(test|check)\.(?:ts|cts|mts)$|^src\/fixtures\//.test(path),
    ),
    'Tests must not be published',
  );
  console.log(
    `${name} verified: ${paths.length} files; demo, tests and development tooling excluded.`,
  );
}
