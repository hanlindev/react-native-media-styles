// @vitest-environment jsdom
import {
  act,
  createElement as h,
  createRef,
  Fragment,
  useState,
  type ReactNode,
} from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';
import {renderToString} from 'react-dom/server';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import createStyledElement from './createElement';
import {registry} from './registry';

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('preserves child state when a sibling and stylesheet rules appear', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  function Counter() {
    const [count, setCount] = useState(0);
    return h(
      'button',
      {id: 'counter', onClick: () => setCount(count + 1)},
      count,
    );
  }
  function App() {
    const [expanded, setExpanded] = useState(false);
    if (expanded) registry.insert('.r-expanded{padding:31px;}', 3);
    const counter = h(Counter, {key: 'counter'});
    return h(
      Fragment,
      null,
      h(
        'button',
        {id: 'toggle', onClick: () => setExpanded(!expanded)},
        'Toggle',
      ),
      createStyledElement('div', {
        id: 'content',
        style: {$$css: true, padding: expanded ? 'r-expanded' : null},
        children: expanded
          ? [counter, h('span', {key: 'sibling'}, 'Sibling')]
          : counter,
      }),
    );
  }
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(h(App)));
    const counter = container.querySelector<HTMLButtonElement>('#counter')!;
    await act(async () => counter.click());
    await act(async () =>
      container.querySelector<HTMLButtonElement>('#toggle')!.click(),
    );
    expect(container.querySelector('#counter')).toBe(counter);
    expect(counter.textContent).toBe('1');
    expect(container.querySelector('#content')!.textContent).toBe('1Sibling');
    expect(document.head.textContent).toContain('padding:31px');
    await act(async () => counter.click());
    await act(async () =>
      container.querySelector<HTMLButtonElement>('#toggle')!.click(),
    );
    expect(container.querySelector('#counter')).toBe(counter);
    expect(counter.textContent).toBe('2');
    expect(container.querySelector('#content')!.textContent).toBe('2');
    expect(errors).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
  }
});

it('renders and hydrates complete nested content with colocated stylesheet companions', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  function Layer({children}: {children: ReactNode}) {
    return h(
      Fragment,
      null,
      h(
        'style',
        {href: 'responsive-layer', precedence: 'responsive'},
        '.layer{width:270px}',
      ),
      createStyledElement('div', {className: 'layer', children}),
    );
  }
  let tree: ReactNode = ['DISCUSSION', 'COLLECTION', 'REVIEW'].map((label) =>
    h(Layer, {
      key: label,
      children: createStyledElement('div', {dir: 'rtl', children: label}),
    }),
  );
  for (let depth = 0; depth < 32; depth++) tree = h(Layer, {children: tree});
  const container = document.createElement('div');
  document.body.append(container);
  container.innerHTML = renderToString(tree);
  expect(container.textContent).toContain('DISCUSSIONCOLLECTIONREVIEW');
  const first = container.querySelector('[dir="rtl"]');
  const root = hydrateRoot(container, tree);
  try {
    await act(async () => {});
    expect(container.querySelector('[dir="rtl"]')).toBe(first);
    expect(container.textContent).toContain('DISCUSSIONCOLLECTIONREVIEW');
    expect(errors).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
  }
});

it.each([
  ['input', {defaultValue: 'Input value'}],
  ['textarea', {defaultValue: 'Textarea value'}],
  ['div', {dangerouslySetInnerHTML: {__html: '<b>HTML value</b>'}}],
])(
  'preserves %s content and refs when resources use siblings',
  async (tag, props) => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ref = createRef<HTMLElement>();
    const element = createStyledElement(tag, {...props, ref});
    const container = document.createElement('div');
    document.body.append(container);
    container.innerHTML = renderToString(element);
    const host = container.querySelector(tag);
    const root = hydrateRoot(container, element);
    try {
      await act(async () => {});
      expect(ref.current).toBe(host);
      if (tag === 'div') expect(host!.innerHTML).toBe('<b>HTML value</b>');
      else if (
        host instanceof HTMLInputElement ||
        host instanceof HTMLTextAreaElement
      )
        expect(host.value).toContain('value');
      expect(errors).not.toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
    }
  },
);
