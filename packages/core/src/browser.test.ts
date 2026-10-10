// @vitest-environment jsdom
import {act, createElement as h, Fragment} from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';
import {renderToString} from 'react-dom/server';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import type {ViewStyle} from 'react-native';
import {
  breakpoints,
  useBreakpointStyle,
  useBreakpointStyles,
} from './breakpoints.web';
import {BreakpointStyles} from './BreakpointStyles.web';

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

function app(token: ReturnType<typeof breakpoints<ViewStyle>>) {
  return h(
    Fragment,
    null,
    h(BreakpointStyles, {tokens: [token]}),
    h(
      'div',
      {
        className: Object.values(Object(useBreakpointStyle(token)))
          .filter((value) => typeof value === 'string')
          .join(' '),
      },
      'content',
    ),
  );
}

it('updates composed styles when conditional array entries change without losing stable token identity', async () => {
  const first = breakpoints<ViewStyle>({base: {width: 123, opacity: 0.5}});
  const second = breakpoints<ViewStyle>({base: {width: 456}});
  const seen: ReturnType<typeof breakpoints<ViewStyle>>[] = [];
  function App({enabled, empty = false}: {enabled: boolean; empty?: boolean}) {
    const result = useBreakpointStyles([
      empty ? null : first,
      !empty && enabled && second,
    ]);
    seen.push(result.token);
    return h(
      Fragment,
      null,
      h(BreakpointStyles, {tokens: [result.token]}),
      h('div', {
        className: Object.values(Object(result.style))
          .filter((value) => typeof value === 'string')
          .join(' '),
      }),
    );
  }
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(h(App, {enabled: false})));
    expect(getComputedStyle(container.firstElementChild!).width).toBe('123px');
    await act(async () => root.render(h(App, {enabled: false})));
    expect(seen.at(-1)).toBe(seen.at(-2));
    await act(async () => root.render(h(App, {enabled: true})));
    expect(getComputedStyle(container.firstElementChild!).width).toBe('456px');
    expect(getComputedStyle(container.firstElementChild!).opacity).toBe('0.5');
    await act(async () => root.render(h(App, {enabled: false})));
    expect(getComputedStyle(container.firstElementChild!).width).toBe('123px');
    await act(async () => root.render(h(App, {enabled: false, empty: true})));
    expect(container.firstElementChild!.className).toBe('');
  } finally {
    await act(async () => root.unmount());
  }
});

it('does not mutate the DOM at token creation and installs resources at render', async () => {
  const token = breakpoints<ViewStyle>({base: {width: 123}});
  expect(document.head.querySelectorAll('style')).toHaveLength(0);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(app(token)));
    expect(document.head.textContent).toContain('width:123px');
    expect(getComputedStyle(container.firstElementChild!).width).toBe('123px');
    const next = breakpoints<ViewStyle>({base: {width: 456}});
    await act(async () => root.render(app(next)));
    expect(document.head.textContent).toContain('width:456px');
    expect(getComputedStyle(container.firstElementChild!).width).toBe('456px');
  } finally {
    await act(async () => root.unmount());
  }
});

it('hydrates SSR resources and reuses them without duplicates', async () => {
  const token = breakpoints<ViewStyle>({base: {width: 777}});
  const html = renderToString(
    h(
      'html',
      null,
      h('head'),
      h('body', null, h('div', {id: 'root'}, app(token))),
    ),
  );
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  document.head.innerHTML = parsed.head.innerHTML;
  document.body.innerHTML = parsed.body.innerHTML;
  const errors: unknown[] = [];
  let root: ReturnType<typeof hydrateRoot>;
  await act(async () => {
    root = hydrateRoot(document.getElementById('root')!, app(token), {
      onRecoverableError: (error) => errors.push(error),
    });
  });
  try {
    expect(errors).toEqual([]);
    expect(
      document.head.querySelectorAll('style[data-href^="rnms-v2-"]'),
    ).toHaveLength(1);
    await act(async () =>
      root.render(h(Fragment, null, app(token), app(token))),
    );
    expect(
      document.head.querySelectorAll('style[data-href^="rnms-v2-"]'),
    ).toHaveLength(1);
  } finally {
    await act(async () => root.unmount());
  }
});
