import {test, expect} from '@playwright/test';

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
    if (mode === 'SSR')
      expect(await page.evaluate(() => window.rnmsProbe.fallbackSeen)).toBe(
        true,
      );
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
    const countResources = () =>
      page.locator('head style[data-href^="rnms-v2-"]').count();
    const before = await countResources();
    expect(before).toBeGreaterThan(0);
    expect(requests.some((url) => /\/details-[^/]+\.js/.test(url))).toBe(false);
    await page.getByTestId('details-link').click();
    await expect(page).toHaveURL(/\/details$/);
    await expect(page.getByTestId('details-panel')).toHaveCSS(
      'padding-left',
      '46px',
    );
    expect(requests.some((url) => /\/details-[^/]+\.js/.test(url))).toBe(true);
    const after = await countResources();
    await page.getByText('← Back to overview').click();
    await expect(panel).toBeVisible();
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

test('SSR: direct lazy-route request has responsive CSS without hydration', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: {width: 1100, height: 900},
  });
  try {
    const page = await context.newPage();
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
