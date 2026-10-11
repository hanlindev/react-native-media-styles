import {test, expect} from '@playwright/test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

test('SSR: cold first paint and delayed hydration have complete CSS and no layout shift', async ({
  request,
}) => {
  test.setTimeout(120000);
  const health = await request.get('http://localhost:8091/health');
  expect(health.status()).toBe(200);
  expect(health.headers()['cache-control']).toBe('no-store');
  expect(await health.json()).toEqual({status: 'ok'});
  const {stdout} = await promisify(execFile)(process.execPath, [
    'scripts/verify-development.mts',
    'http://localhost:8091/',
  ]);
  expect(stdout).toContain('zero layout shift');
  const mobile = await promisify(execFile)(process.execPath, [
    'scripts/verify-development.mts',
    'http://localhost:8091/',
    '390',
    '--warm',
  ]);
  expect(mobile.stdout).toContain('zero layout shift');
  const warm = await promisify(execFile)(process.execPath, [
    'scripts/verify-development.mts',
    'http://localhost:8091/',
    '1440',
    '--warm',
    '--natural',
  ]);
  expect(warm.stdout).toContain('stable hydration');
});

declare global {
  interface Window {
    rnmsProbe: {fallbackSeen: boolean; firstPadding?: string};
  }
}

for (const [mode, port] of [
  ['SSR', 8091],
  ['SPA', 8092],
] as const) {
  test(`${mode}: responsive resources, interactivity and lazy navigation`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.setViewportSize({width: 1100, height: 1000});
    await page.addInitScript(() => {
      window.rnmsProbe = {fallbackSeen: false};
      function frame() {
        const fallback = document.querySelector(
          '[data-testid="stream-fallback"]',
        );
        if (
          fallback &&
          !fallback.closest('[hidden]') &&
          fallback.getClientRects().length
        )
          window.rnmsProbe.fallbackSeen = true;
        const panel = document.querySelector('[data-testid="streamed-card"]');
        if (
          panel &&
          !panel.closest('[hidden]') &&
          panel.getClientRects().length
        ) {
          window.rnmsProbe.firstPadding = getComputedStyle(panel).paddingLeft;
        } else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    await page.goto(`http://localhost:${port}/`);
    const panel = page.getByTestId('streamed-card');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveCSS('padding-left', '40px');
    await expect
      .poll(() => page.evaluate(() => window.rnmsProbe.firstPadding))
      .toBe('40px');
    // The first cold-render test verifies fallback/reveal. On subsequent
    // requests React.lazy has cached the module, so no fallback is required.
    await expect(page.getByTestId('responsive-grid')).toHaveCSS(
      'flex-direction',
      'row',
    );
    const card = page.locator('[data-testid^="responsive-card-"]').first();
    await expect(card).toHaveCSS('flex-grow', '1');
    await expect(card).toHaveCSS('flex-shrink', '0');
    await expect(card).toHaveCSS('flex-basis', '0px');
    await page.getByTestId('counter').click();
    await expect(page.getByTestId('counter')).toHaveText(
      'Test interactivity · 1',
    );
    await expect(page.getByTestId('counter')).toHaveCSS('padding-left', '31px');
    const countResources = () =>
      page
        .locator(
          'head style[data-precedence="react-native-media-styles"][data-href^="rnms-"]',
        )
        .count();
    const before = await countResources();
    expect(before).toBeGreaterThan(0);
    expect(requests.some((url) => /\/details-[^/]+\.js/.test(url))).toBe(false);
    await page.getByTestId('details-link').click();
    await expect(page).toHaveURL(/\/details$/);
    await expect(page.getByTestId('details-panel')).toHaveCSS(
      'padding-left',
      '46px',
    );
    await expect(
      page
        .getByTestId('page-shell')
        .filter({has: page.getByTestId('details-panel')}),
    ).toHaveCSS('background-color', 'rgb(244, 242, 237)');
    await expect(
      page
        .getByTestId('page-frame')
        .filter({has: page.getByTestId('details-panel')}),
    ).toHaveCSS('max-width', '1240px');
    await expect(page.getByTestId('details-panel')).toBeVisible();
    expect(requests.some((url) => /\/details-[^/]+\.js/.test(url))).toBe(true);
    const after = await countResources();
    await page.getByText('← Back to overview').click();
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('counter')).toHaveText(
      'Test interactivity · 1',
    );
    await page.getByTestId('details-link').click();
    await expect(page.getByTestId('details-panel')).toBeVisible();
    await page.getByText('← Back to overview').click();
    await expect(page).toHaveURL(/\/$/);
    expect(await countResources()).toBe(after);
    await page.setViewportSize({width: 390, height: 844});
    await expect(panel).toHaveCSS('padding-left', '24px');
    await expect(page.getByTestId('responsive-grid')).toHaveCSS(
      'flex-direction',
      'column',
    );
    expect(errors).toEqual([]);
  });
}

test('SSR: direct details request has responsive CSS with hydration bundles blocked', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: {width: 1100, height: 900},
  });
  try {
    const page = await context.newPage();
    // React's inline streaming scripts reveal server boundaries. Block Expo's
    // external bundles to verify delivery without client rendering/hydration.
    await page.route(/\.js(?:\?|$)/, (route) => route.abort());
    await page.goto('http://localhost:8091/details');
    await expect(page.getByTestId('details-panel')).toBeVisible();
    await expect(page.getByTestId('details-panel')).toHaveCSS(
      'padding-left',
      '46px',
    );
  } finally {
    await context.close();
  }
});
