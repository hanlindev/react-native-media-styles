import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
import {test} from 'node:test';

const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('expo/bin/cli'));
const cliRequire = createRequire(expoRequire.resolve('@expo/cli'));
const {createRequestHandler} = cliRequire('expo-server/adapter/http');
for (const scenario of ['cancel', 'error', 'error after cancel']) {
  test(`${scenario} preserves the correct error handling`, async () => {
    const req = Object.assign(new EventEmitter(), {
      url: '/',
      method: 'GET',
      headers: {host: 'localhost'},
      rawHeaders: ['Host', 'localhost'],
      socket: {},
      destroyed: false,
      destroy() {
        this.destroyed = true;
      },
    });
    const res = Object.assign(new EventEmitter(), {writableEnded: false});
    const failure = new Error('Actual route failure');
    const routeErrors = [];
    const nextErrors = [];
    let entered;
    const ready = new Promise((resolve) => {
      entered = resolve;
    });
    const handler = createRequestHandler(
      {build: process.cwd()},
      {
        getRoutesManifest: async () => ({
          htmlRoutes: [
            {page: '/', file: 'index.js', namedRegex: /^\/$/, routeKeys: {}},
          ],
          apiRoutes: [],
          notFoundRoutes: [],
        }),
        getHtml: async (request) => {
          entered();
          if (scenario === 'error') throw failure;
          return new Promise((resolve, reject) => {
            request.signal.addEventListener(
              'abort',
              () =>
                reject(scenario === 'cancel' ? request.signal.reason : failure),
              {once: true},
            );
          });
        },
        handleRouteError: async (error) => {
          routeErrors.push(error);
          throw error;
        },
      },
    );
    const completion = handler(req, res, (error) => nextErrors.push(error));
    await ready;
    if (scenario !== 'error') res.emit('close');
    await completion;
    if (scenario === 'cancel') {
      assert.deepEqual(routeErrors, []);
      assert.deepEqual(nextErrors, []);
    } else {
      assert.deepEqual(routeErrors, [failure]);
      assert.deepEqual(nextErrors, [failure]);
    }
  });
}
