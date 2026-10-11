import {test, expect} from '@playwright/test';
import {createServer} from 'node:http';
import {createElement as h, Fragment, Suspense} from 'react';
import {renderToPipeableStream} from 'react-dom/server';
import type {ViewStyle} from 'react-native';
import {breakpoints} from '../../../packages/core/src/breakpoints.web';
import {BreakpointStyles} from '../../../packages/core/src/BreakpointStyles.web';
import {sheetResources} from '../../../packages/metro/src/resources';

for (const responsiveFirst of [true, false]) {
  test(`streaming: responsive boundary first=${responsiveFirst}`, async ({
    page,
  }) => {
    const token = breakpoints<ViewStyle>({
      base: {paddingLeft: 17},
      '(min-width: 800px)': {paddingLeft: 43},
    });
    const classes = Object.values(Object(token.style))
      .filter((value) => typeof value === 'string')
      .join(' ');
    const css = sheetResources(
      '[stylesheet-group="3"]{}\n.r-conflict{padding-left:91px;}',
    );
    const server = createServer((_request, response) => {
      function delayed(delay: number, children: React.ReactNode) {
        let ready = false;
        const gate = new Promise<void>((resolve) =>
          setTimeout(() => {
            ready = true;
            resolve();
          }, delay),
        );
        function Boundary() {
          if (!ready) throw gate;
          return children;
        }
        return h(Suspense, {fallback: h('div', null, 'waiting')}, h(Boundary));
      }
      const ordinary = h(
        Fragment,
        null,
        ...css.map((resource) =>
          h(
            'style',
            {
              key: resource.id,
              href: resource.id,
              precedence: resource.precedence,
            },
            resource.css,
          ),
        ),
        h('div', {id: 'ordinary-ready'}),
      );
      const responsive = h(
        Fragment,
        null,
        h(BreakpointStyles, {tokens: [token]}),
        h(
          'div',
          {id: 'responsive', className: `${classes} r-conflict`},
          'card',
        ),
      );
      const stream = renderToPipeableStream(
        h(
          'html',
          null,
          h('head'),
          h(
            'body',
            null,
            delayed(50, responsiveFirst ? responsive : ordinary),
            delayed(300, responsiveFirst ? ordinary : responsive),
          ),
        ),
        {
          onShellReady() {
            response.setHeader('Content-Type', 'text/html');
            stream.pipe(response);
          },
          onError(error) {
            response.destroy(error instanceof Error ? error : undefined);
          },
        },
      );
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    try {
      const address = server.address();
      if (!address || typeof address === 'string')
        throw new Error('Missing test port');
      await page.setViewportSize({width: 1100, height: 900});
      await page.goto(`http://127.0.0.1:${address.port}`);
      await expect(page.locator('#ordinary-ready')).toBeAttached();
      await expect(page.locator('#responsive')).toBeVisible();
      await expect(page.locator('#responsive')).toHaveCSS(
        'padding-left',
        '43px',
      );
      await page.setViewportSize({width: 390, height: 844});
      await expect(page.locator('#responsive')).toHaveCSS(
        'padding-left',
        '17px',
      );
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
}
