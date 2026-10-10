import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

// npm ships with Node. Calling its JS entry avoids shell-dependent npm.cmd quoting.
import {createRequire} from 'node:module';
import {dirname, join, delimiter} from 'node:path';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const coreDirectory = fileURLToPath(
  new URL('../packages/core/', import.meta.url),
);
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
const result = spawnSync(
  process.execPath,
  [npm, 'pack', '--dry-run', '--json', '--ignore-scripts'],
  {encoding: 'utf8', cwd: coreDirectory},
);
if (result.status !== 0) throw new Error(result.stderr || result.stdout);
const [{name, files}] = JSON.parse(result.stdout);
assert.equal(name, '@react-native-media-styles/core');
const paths = files.map((file) => file.path);
assert(paths.includes('src/BreakpointStyles.web.ts'));
assert(paths.includes('src/BreakpointStyles.native.ts'));
assert(paths.includes('README.md'));
assert(paths.includes('LICENSE'));
assert(
  !paths.some((path) => /^(examples|docs|scripts)\//.test(path)),
  'Demo/tooling files must not be published',
);
assert(
  !paths.some((path) => /\.(test|check)\.ts$|^src\/fixtures\//.test(path)),
  'Tests must not be published',
);
console.log(
  `Package verified: ${paths.length} files; demo, tests and development tooling excluded.`,
);
