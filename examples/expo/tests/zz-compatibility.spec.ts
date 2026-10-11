import {test, expect} from '@playwright/test';

for (const port of [8091, 8092, 8097]) {
  test(`${port}: cloning, single children, refs and render props`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.setViewportSize({width: 1100, height: 900});
    if (port === 8092) {
      await page.goto(`http://localhost:${port}/`);
      await page.getByTestId('compatibility-link').click();
    } else {
      await page.goto(`http://localhost:${port}/compatibility`);
    }
    await page.getByTestId('cloned-child').click();
    await page.getByTestId('focus-input').click();
    await expect(page.getByTestId('ref-input')).toBeFocused();
    await expect(page.getByTestId('compatibility-state')).toHaveText('1:true');
    await page.getByTestId('babel-only').click();
    await expect(page.getByTestId('compatibility-state')).toHaveText('2:true');
    await page.getByTestId('focus-dom').click();
    await expect(page.getByTestId('babel-only')).toBeFocused();
    await expect(page.getByTestId('babel-only')).toHaveCSS(
      'padding-left',
      '43px',
    );
    await expect(page.locator('a#factory-cloned')).toHaveAttribute(
      'href',
      '/details',
    );
    await expect(page.locator('svg defs linearGradient')).toHaveAttribute(
      'id',
      'gradient',
    );
    await expect(page.locator('svg style')).toHaveCount(0);
    await expect(page.getByTestId('render-prop')).toHaveText('Idle');
    for (const id of ['cloned-child', 'ordinary-first', 'responsive-first']) {
      await expect(page.getByTestId(id)).toHaveCSS('padding-left', '43px');
    }
    await expect(page.getByTestId('inline-wins')).toHaveCSS(
      'padding-left',
      '67px',
    );
    // Exercise both physical stylesheet orders, independent of React's initial
    // discovery order, using actual core and Metro resources.
    for (const selector of [
      'head style[data-precedence="react-native-media-styles"]',
      'head style[data-href^="rnms-expo-"]',
    ]) {
      await page.evaluate((selector) => {
        document
          .querySelectorAll(selector)
          .forEach((style) => document.head.append(style));
      }, selector);
      await expect(page.getByTestId('ordinary-first')).toHaveCSS(
        'padding-left',
        '43px',
      );
      await expect(page.getByTestId('responsive-first')).toHaveCSS(
        'padding-left',
        '43px',
      );
    }
    await page.setViewportSize({width: 390, height: 844});
    await expect(page.getByTestId('cloned-child')).toHaveCSS(
      'padding-left',
      '17px',
    );
    await page.getByTestId('as-child').click();
    await expect(page).toHaveURL(/\/details$/);
    expect(errors).toEqual([]);
  });
}
