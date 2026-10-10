import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const [mode, ...args] = process.argv.slice(2);
if (!['server', 'single', 'static'].includes(mode))
  throw new Error('Choose server, single, or static');
const child = spawn(
  process.execPath,
  [require.resolve('expo/bin/cli'), ...args],
  {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: {...process.env, DEMO_OUTPUT: mode},
    stdio: 'inherit',
  },
);
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
