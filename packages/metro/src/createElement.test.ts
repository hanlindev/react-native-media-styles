import {createElement, Fragment} from 'react';
import {expect, it} from 'vitest';
import createStyledElement, {elementClassName} from './createElement';
import {registry} from './registry';

it('reads the host classes through locale providers', () => {
  const host = createElement('div', {className: 'r-text'});
  expect(elementClassName(host)).toBe('r-text');
  expect(elementClassName(createElement(Fragment, null, host))).toBe('r-text');
  expect(
    elementClassName(
      createElement(Fragment, null, createElement(Fragment, null, host)),
    ),
  ).toBe('r-text');
  expect(elementClassName(createElement('div'))).toBe('');
});

it('delivers locale-wrapped host rules without unrelated resources', () => {
  registry.insert('.r-height{height:20px;}', 3);
  registry.insert('.r-unrelated{width:300px;}', 3);
  const element = createStyledElement('div', {
    dir: 'rtl',
    style: {$$css: true, height: 'r-height'},
  });
  const output = JSON.stringify(element);
  expect(output).toContain('height:20px;');
  expect(output).not.toContain('width:300px;');
});
