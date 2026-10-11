import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {test} from 'node:test';
import {assertPortAvailable, openSelectedAndroid} from './android.mts';

test('waits for Metro and launches only the pinned device on its actual port', async () => {
  const commands: string[][] = [];
  let requests = 0;
  const server = createServer((_request, response) => {
    requests++;
    assert.equal(commands.length, 0, 'ADB must wait for Metro');
    response.end(requests === 1 ? 'starting' : 'packager-status:running');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const port = address.port;
  try {
    await assert.rejects(assertPortAvailable(port), /Port .* is unavailable/);
    await openSelectedAndroid('emulator-5556', port, {
      adb: 'test-adb',
      run: async (binary, args) => {
        assert.equal(binary, 'test-adb');
        assert.deepEqual(args.slice(0, 2), ['-s', 'emulator-5556']);
        commands.push(args);
        return {stdout: 'package:/installed/expo-go.apk'};
      },
    });
    assert.equal(requests, 2);
    assert.equal(commands.length, 3);
    assert.deepEqual(commands[1].slice(2), [
      'reverse',
      `tcp:${port}`,
      `tcp:${port}`,
    ]);
    assert.ok(commands[2].includes(`exp://127.0.0.1:${port}`));
    assert.equal(commands[2].at(-1), 'host.exp.exponent');
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('canceling startup never launches ADB', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    openSelectedAndroid('emulator-5556', 8084, {
      signal: controller.signal,
      run: () => assert.fail('Canceled startup must not run ADB'),
    }),
    {name: 'AbortError'},
  );
});
