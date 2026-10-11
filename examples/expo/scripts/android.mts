import {execFile, type ExecFileOptions} from 'node:child_process';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {promisify} from 'node:util';

const execute = promisify(execFile);

export async function assertPortAvailable(port: number) {
  for (const host of ['127.0.0.1', '::1']) {
    const server = createServer();
    await new Promise((resolve, reject) => {
      server.once('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRNOTAVAIL' || error.code === 'EAFNOSUPPORT')
          resolve(undefined);
        else
          reject(
            new Error(
              `Port ${port} is unavailable. Stop the existing server or pass --port with a free port.`,
              {cause: error},
            ),
          );
      });
      server.listen(port, host, () => server.close(resolve));
    });
  }
}

export function findAdb() {
  const sdk =
    process.env.ANDROID_HOME ??
    process.env.ANDROID_SDK_ROOT ??
    (process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk')
      : undefined);
  if (sdk) {
    const binary = join(
      sdk,
      'platform-tools',
      process.platform === 'win32' ? 'adb.exe' : 'adb',
    );
    if (existsSync(binary)) return binary;
  }
  return 'adb';
}

export async function openSelectedAndroid(
  serial: string,
  port: number,
  {
    signal,
    run = execute,
    adb = findAdb(),
  }: {
    signal?: AbortSignal;
    run?: (
      binary: string,
      args: string[],
      options: ExecFileOptions,
    ) => Promise<{stdout: string | Buffer}>;
    adb?: string;
  } = {},
) {
  const url = `http://localhost:${port}/status`;
  const deadline = Date.now() + 120000;
  while (true) {
    signal?.throwIfAborted();
    try {
      const response = await fetch(url, {
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(1000)])
          : AbortSignal.timeout(1000),
      });
      if (
        response.ok &&
        (await response.text()).includes('packager-status:running')
      )
        break;
    } catch {
      signal?.throwIfAborted();
    }
    if (Date.now() >= deadline)
      throw new Error(`Metro did not become ready on port ${port}`);
    await delay(500, undefined, {signal});
  }

  const options = {windowsHide: true, timeout: 30000, signal};
  const {stdout} = await run(
    adb,
    ['-s', serial, 'shell', 'pm', 'path', 'host.exp.exponent'],
    options,
  );
  if (!stdout.toString().includes('package:'))
    throw new Error(`Install Expo Go on ${serial} before running pnpm android`);
  await run(
    adb,
    ['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`],
    options,
  );
  await run(
    adb,
    [
      '-s',
      serial,
      'shell',
      'am',
      'start',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      `exp://127.0.0.1:${port}`,
      '-p',
      'host.exp.exponent',
    ],
    options,
  );
  console.log(
    `Opened Expo Go on ${serial}. Metro keyboard commands remain available.`,
  );
}
