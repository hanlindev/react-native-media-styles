import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport: {width: 1100, height: 900}});
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.developmentFrames = [];
    let previous = '';
    function frame() {
      const button = document.querySelector('[data-testid="counter"]');
      const grid = document.querySelector('[data-testid="responsive-grid"]');
      const state = {
        shell: Boolean(button && button.getClientRects().length),
        background: button ? getComputedStyle(button).backgroundColor : null,
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
  await page.goto(process.argv[2] ?? 'http://localhost:8081/', {
    waitUntil: 'networkidle',
    timeout: 120000,
  });
  await page.getByTestId('streamed-card').waitFor();
  await page.getByTestId('counter').click();
  await page.getByText('Test interactivity · 1', {exact: true}).waitFor();
  const frames = await page.evaluate(() => window.developmentFrames);
  const firstShell = frames.findIndex((frame) => frame.shell);
  assert.ok(firstShell >= 0, 'The SSR shell must become visible');
  for (const frame of frames.slice(firstShell)) {
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
      'row',
      'Responsive CSS must apply from first paint',
    );
    assert.equal(
      frame.toast,
      false,
      'Route bundling must not show a whole-page fallback',
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    'Development first paint, stable hydration, streaming, and interactivity verified.',
  );
} finally {
  await browser.close();
}
