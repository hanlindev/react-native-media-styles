import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {assertPortAvailable, openSelectedAndroid} from './android.mts';

const require = createRequire(import.meta.url);
const [mode, ...args] = process.argv.slice(2);
if (!['server', 'single', 'static'].includes(mode))
  throw new Error('Choose server, single, or static');
// Run Expo in this process so its interactive input and shutdown handlers own
// the terminal directly, without a child-process wrapper on Windows.
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
process.env.DEMO_OUTPUT = mode;
const serial = process.env.ANDROID_SERIAL;
if (
  args[0] === 'start' &&
  serial &&
  args.includes('--android') &&
  !args.includes('--help') &&
  !args.includes('-h') &&
  !args.includes('--dev-client')
) {
  // Bypass Expo's device picker and explicit device selection. Keep Metro's
  // stdin untouched and launch Expo Go through ADB on the configured serial.
  args.splice(args.indexOf('--android'), 1);
  let port = 8081;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--port' || args[index] === '-p')
      port = Number(args[index + 1]);
  }
  if (!Number.isInteger(port) || port <= 0 || port > 65535)
    throw new Error('Invalid Metro port');
  await assertPortAvailable(port);
  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort());
  process.once('SIGTERM', () => controller.abort());
  void openSelectedAndroid(serial, port, {signal: controller.signal}).catch(
    (error) => {
      if (!controller.signal.aborted)
        console.error(
          `Could not open Android: ${error instanceof Error ? error.message : String(error)}`,
        );
    },
  );
}
process.argv = [process.execPath, require.resolve('expo/bin/cli'), ...args];
require('expo/bin/cli');
