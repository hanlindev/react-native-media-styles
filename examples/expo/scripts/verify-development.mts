import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

type Frame = {
  missingRules: string[];
  shell: boolean;
  background: string | null;
  pageBackground: string | null;
  frameWidth: number | null;
  frameLeft: number | null;
  framePadding: string | null;
  gridTop: number | null;
  fallback: boolean;
  panel: boolean;
  panelBackground: string | null;
  panelPadding: string | null;
  direction: string | null;
  toast: boolean;
};
interface LayoutShift extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}
declare global {
  interface Window {
    developmentFrames: Frame[];
    layoutShiftTotal: number;
  }
}

const browser = await chromium.launch();
try {
  const width = Number(process.argv[3] ?? 1440);
  const wide = width >= 800;
  const page = await browser.newPage({viewport: {width, height: 1200}});
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.addInitScript(() => {
    window.developmentFrames = [];
    window.layoutShiftTotal = 0;
    const isLayoutShift = (entry: PerformanceEntry): entry is LayoutShift =>
      entry.entryType === 'layout-shift';
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (isLayoutShift(entry) && !entry.hadRecentInput)
          window.layoutShiftTotal += entry.value;
      }
    }).observe({type: 'layout-shift', buffered: true});
    let sheetSignature = '';
    let availableClasses = new Set<string>();
    let previous = '';
    function frame() {
      const sheets = [...document.styleSheets];
      const signature = sheets.map((sheet) => sheet.cssRules.length).join(',');
      if (signature !== sheetSignature) {
        availableClasses = new Set();
        const visit = (rules: CSSRuleList) => {
          for (const rule of rules) {
            for (const match of (rule instanceof CSSStyleRule
              ? rule.selectorText
              : ''
            ).matchAll(/\.((?:r-|css-)[\w-]+)/g))
              availableClasses.add(match[1]);
            if (rule instanceof CSSGroupingRule) visit(rule.cssRules);
          }
        };
        for (const sheet of sheets) visit(sheet.cssRules);
        sheetSignature = signature;
      }
      const button = document.querySelector('[data-testid="counter"]');
      const primaryButton = document.querySelector(
        '[data-testid="details-link"]',
      );
      const grid = document.querySelector('[data-testid="responsive-grid"]');
      const shell = document.querySelector('[data-testid="page-shell"]');
      const container = document.querySelector('[data-testid="page-frame"]');
      const panel = document.querySelector('[data-testid="streamed-card"]');
      const fallback = document.querySelector(
        '[data-testid="stream-fallback"]',
      );
      const visible = (node: Element | null) =>
        Boolean(
          node && !node.closest('[hidden]') && node.getClientRects().length,
        );
      const state = {
        missingRules: [
          ...new Set(
            [...document.querySelectorAll('[class]')]
              .filter((node) => visible(node))
              .flatMap((node) => [...node.classList])
              .filter(
                (name) =>
                  /^(r-|css-)/.test(name) && !availableClasses.has(name),
              ),
          ),
        ],
        shell: visible(button),
        background: primaryButton
          ? getComputedStyle(primaryButton).backgroundColor
          : null,
        pageBackground: shell ? getComputedStyle(shell).backgroundColor : null,
        frameWidth: container ? container.getBoundingClientRect().width : null,
        frameLeft: container ? container.getBoundingClientRect().left : null,
        framePadding: container
          ? getComputedStyle(container).paddingLeft
          : null,
        gridTop: grid ? grid.getBoundingClientRect().top : null,
        fallback: visible(fallback),
        panel: visible(panel),
        panelBackground: panel ? getComputedStyle(panel).backgroundColor : null,
        panelPadding: panel ? getComputedStyle(panel).paddingLeft : null,
        direction: grid ? getComputedStyle(grid).flexDirection : null,
        toast: Boolean(document.body?.textContent.includes('Bundling...')),
      };
      const key = JSON.stringify(state);
      if (key !== previous) {
        window.developmentFrames.push(state);
        previous = key;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
  // Hold hydration assets back so the first visible frames necessarily come
  // from SSR rather than a fast client concealing missing server CSS.
  if (!process.argv.includes('--natural'))
    await page.route(/\.(?:js|bundle)(?:\?|$)/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1800));
      await route.continue();
    });
  await page.goto(process.argv[2] ?? 'http://localhost:8081/', {
    waitUntil: 'networkidle',
    timeout: 120000,
  });
  await page.getByTestId('streamed-card').waitFor();
  assert.equal(
    await page.evaluate(() => window.layoutShiftTotal),
    0,
    'Streaming and hydration must not shift visible content',
  );
  await page.getByTestId('counter').click();
  await page.getByText('Test interactivity · 1', {exact: true}).waitFor();
  await page.waitForTimeout(1800);
  assert.equal(
    await page
      .getByTestId('counter')
      .evaluate((node) => getComputedStyle(node).paddingLeft),
    '31px',
    'New client rules must override server shorthands',
  );
  const frames = await page.evaluate(() => window.developmentFrames);
  const firstShell = frames.findIndex((frame) => frame.shell);
  const firstPanel = frames.findIndex((frame) => frame.panel);
  assert.ok(firstPanel >= 0);
  for (const frame of frames.slice(firstPanel)) {
    assert.equal(
      frame.panel,
      true,
      'A revealed card must remain visible throughout hydration',
    );
    assert.equal(
      frame.fallback,
      false,
      'Hydration must not restore the loading placeholder',
    );
  }
  assert.ok(firstShell >= 0, 'The SSR shell must become visible');
  for (const frame of frames.slice(firstShell)) {
    assert.deepEqual(
      frame.missingRules,
      [],
      'Every visible RNW class must have a CSS rule before hydration',
    );
    assert.equal(
      frame.shell,
      true,
      'Hydration must not replace the visible shell',
    );
    assert.equal(
      frame.background,
      'rgb(23, 44, 50)',
      'Ordinary RNW styles must apply from first paint',
    );
    assert.equal(
      frame.direction,
      wide ? 'row' : 'column',
      'Responsive CSS must apply from first paint',
    );
    assert.equal(
      frame.pageBackground,
      'rgb(244, 242, 237)',
      'Page background must be complete before hydration',
    );
    assert.equal(
      frame.frameWidth,
      Math.min(width, 1240),
      'The shell must be constrained from its first visible frame',
    );
    assert.equal(
      frame.frameLeft,
      Math.max(0, (width - 1240) / 2),
      'Hydration must not change the side margins',
    );
    assert.equal(frame.framePadding, wide ? '56px' : '20px');
    assert.equal(
      frame.gridTop,
      frames[firstShell].gridTop,
      'Hydration must not shift the grid',
    );
    if (frame.panel) {
      assert.equal(
        frame.panelBackground,
        'rgb(220, 233, 223)',
        'Late RNW CSS must precede boundary reveal',
      );
      assert.equal(
        frame.panelPadding,
        wide ? '40px' : '24px',
        'Late responsive CSS must precede boundary reveal',
      );
    }
    assert.equal(
      frame.toast,
      false,
      'Route bundling must not show a whole-page fallback',
    );
  }
  if (process.argv[4] !== '--warm')
    assert.ok(
      frames.some((frame) => frame.fallback),
      'The shell must stream before the delayed boundary',
    );
  assert.ok(
    frames.some((frame) => frame.panel),
    'The boundary must be revealed',
  );
  assert.deepEqual(errors, []);
  console.log(
    'Complete first paint, zero layout shift, stable hydration, streaming, and interactivity verified.',
  );
} finally {
  await browser.close();
}
