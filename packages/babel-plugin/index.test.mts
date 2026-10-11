import assert from 'node:assert/strict';
import {test} from 'node:test';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import * as babel from '@babel/core';
import plugin from './dist/index.cjs';
const require = createRequire(import.meta.url);
const core = '@react-native-media-styles/core';
const imports = `import {useBreakpointStyle, useBreakpointStyles} from '${core}';`;
function transform(source: string, compiled = false): string {
  const result = babel.transformSync(source, {
    configFile: false,
    babelrc: false,
    parserOpts: {plugins: ['jsx', 'typescript']},
    plugins: [
      plugin,
      ...(compiled
        ? [
            [
              require('@babel/plugin-transform-react-jsx'),
              {pragma: 'h', pragmaFrag: 'Fragment'},
            ],
            require('@babel/plugin-transform-modules-commonjs'),
          ]
        : []),
    ],
  });
  assert.ok(result?.code);
  return result.code;
}
type Element = {
  type: unknown;
  props: {tokens: unknown[]; style: unknown; ref: unknown};
  children: Element[];
};
function run(source: string, hooks: Record<string, unknown> = {}) {
  const companion = function BreakpointStyles() {};
  const exports: Record<string, (...args: unknown[]) => Element> = {};
  vm.runInNewContext(transform(source, true), {
    exports,
    require: () => ({BreakpointStyles: companion, ...hooks}),
    h: (type: unknown, props: unknown, ...children: unknown[]) => ({
      type,
      props,
      children,
    }),
    Fragment: 'fragment',
  });
  return exports;
}

test('inline token expressions run once; the companion receives tokens before rendering', () => {
  let evaluations = 0;
  const token = {style: {padding: 24}};
  const {Card} = run(
    `${imports}
    import {breakpoints} from '${core}';
    function getToken() { return breakpoints({base: {padding: 24}}); }
    export const Card = () => <div style={useBreakpointStyle(getToken())} />;
  `,
    {
      breakpoints: () => {
        evaluations++;
        return token;
      },
      useBreakpointStyle: (value: {style: unknown}) => value.style,
    },
  );
  const result = Card();
  assert.equal(evaluations, 1);
  assert.deepEqual(Array.from(result.children[0].props.tokens), [token]);
  assert.equal(result.children[1].props.style, token.style);
  const next = Card();
  assert.notEqual(
    result.children[0].props.tokens,
    next.children[0].props.tokens,
  );
});

test('composition registers the actual combined token with conditional array inputs', () => {
  const combined = {token: {}, style: {padding: 40}};
  let calls = 0;
  const {Card} = run(
    `${imports}
    export const Card = ({active}) => {
      const {style} = useBreakpointStyles([active && null, undefined]);
      return active ? <div style={style} /> : null;
    };
  `,
    {
      useBreakpointStyles: () => {
        calls++;
        return combined;
      },
    },
  );
  for (const active of [true, false]) {
    const result = Card({active});
    assert.equal(result.children[0].props.tokens[0], combined.token);
    if (active) assert.equal(result.children[1].props.style, combined.style);
    else assert.equal(result.children[1], null);
  }
  assert.equal(calls, 2);
});

test('aliases and namespace imports work; shadowed or unrelated functions are untouched', () => {
  const code =
    transform(`import {useBreakpointStyle as responsive} from '${core}';
    import * as media from '${core}';
    const Card = () => <div style={responsive(token)} />;
    function Other() { const style = media.useBreakpointStyle(token); return <div style={style}/>; }
    function Shadow(responsive) { return <div style={responsive(token)} />; }
  `);
  assert.equal((code.match(/tokens=\{/g) ?? []).length, 2);
  assert.match(code, /function Shadow\(responsive\) \{\s*return <div/);
  const plain = transform(
    `import {useBreakpointStyle} from 'other'; const Card = () => <div style={useBreakpointStyle(token)}/>;`,
  );
  assert.doesNotMatch(plain, /breakpointTokens/);
});

test('memo and forwardRef callbacks get their own companions without changing refs', () => {
  const token = {style: {padding: 24}};
  const ref = {};
  const {Card, RefCard} = run(
    `${imports}
    import {memo, forwardRef} from 'react';
    const token = {style: {padding: 24}};
    export const Card = memo(() => <div style={useBreakpointStyle(token)} />);
    export const RefCard = forwardRef((props, ref) => <div ref={ref} style={useBreakpointStyle(token)} />);
  `,
    {
      memo: (component: unknown) => component,
      forwardRef: (component: unknown) => component,
      useBreakpointStyle: () => token.style,
    },
  );
  assert.equal(Card().children[0].props.tokens.length, 1);
  const forwarded = RefCard({}, ref);
  assert.equal(forwarded.children[0].props.tokens.length, 1);
  assert.equal(forwarded.children[1].props.ref, ref);
  assert.equal(forwarded.children[1].props.style, token.style);
});

test('custom hooks and nested callbacks are not assigned companions by their parent', () => {
  const code = transform(`${imports}
    function useCard() { return useBreakpointStyle(token); }
    function Card() { const nested = () => useBreakpointStyle(token); return <div/>; }
  `);
  assert.doesNotMatch(code, /_BreakpointStyles/);
});

test('all component returns, including null, are wrapped; directives and TypeScript survive', () => {
  const code = transform(`${imports}
    export function Card(hidden: boolean) {
      'use strict';
      const style = useBreakpointStyle<ViewStyle>(token);
      if (hidden) return null;
      return <div style={style}/>;
    }
  `);
  assert.equal((code.match(/tokens=\{/g) ?? []).length, 2);
  assert.match(code, /'use strict';/);
  assert.match(code, /useBreakpointStyle<ViewStyle>/);
});
