import {createElement as h, Fragment, Suspense} from 'react';
import {renderToStaticMarkup, renderToReadableStream} from 'react-dom/server';
import {View} from 'react-native-web';
import {describe, expect, it} from 'vitest';
import type {ViewStyle} from 'react-native';
import {breakpoints, useBreakpointStyle} from './breakpoints.web';
import {BreakpointStyles} from './BreakpointStyles.web';
import {BreakpointStyles as NativeStyles} from './BreakpointStyles.native';
import {getBreakpointSheet} from './sheet';

const card = breakpoints<ViewStyle>({
  base: {width: 301},
  '(min-width: 600px)': {width: 602},
});
function Card() {
  return h(
    Fragment,
    null,
    h(BreakpointStyles, {tokens: [card]}),
    h(View, {style: useBreakpointStyle(card)}),
  );
}

describe('stylesheet resources', () => {
  it('hoists and deduplicates styles used by rendered components only', () => {
    const unused = breakpoints<ViewStyle>({base: {height: 999}});
    const html = renderToStaticMarkup(
      h('html', null, h('head'), h('body', null, h(Card), h(Card))),
    );
    const css = getBreakpointSheet([card]);
    expect(html).toContain(css);
    expect(html.split(css)).toHaveLength(2);
    expect(html.indexOf(css)).toBeLessThan(html.indexOf('</head>'));
    expect(html).not.toContain(getBreakpointSheet([unused]));
    expect(html).toContain('data-precedence="react-native-media-styles"');
  });

  it('does not omit CSS on a later request that reuses cached modules', () => {
    const first = renderToStaticMarkup(
      h('html', null, h('head'), h('body', null, h(Card))),
    );
    const second = renderToStaticMarkup(
      h('html', null, h('head'), h('body', null, h(Card))),
    );
    expect(first).toBe(second);
    expect(second).toContain(getBreakpointSheet([card]));
  });

  it('streams the shell before late content and resources, independently per request', async () => {
    async function request() {
      let ready = false;
      let resolveGate = () => {};
      const gate = new Promise<void>((resolve) => {
        resolveGate = resolve;
      });
      function Late() {
        if (!ready) throw gate;
        return h(Card);
      }
      const stream = await renderToReadableStream(
        h(
          'html',
          null,
          h('head'),
          h(
            'body',
            null,
            h(
              Suspense,
              {fallback: h('div', null, 'Waiting for card')},
              h(Late),
            ),
          ),
        ),
      );
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      const first = await reader.read();
      const shell = decoder.decode(first.value, {stream: true});
      expect(shell).toContain('Waiting for card');
      expect(shell).not.toContain(getBreakpointSheet([card]));
      ready = true;
      resolveGate();
      let rest = '';
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        rest += decoder.decode(chunk.value, {stream: true});
      }
      rest += decoder.decode();
      expect(rest).toContain(getBreakpointSheet([card]));
      expect(rest).toContain('data-precedence="react-native-media-styles"');
      return rest;
    }
    await Promise.all([request(), request()]);
  });

  it('renders nothing for native companions and empty web tokens', () => {
    expect(NativeStyles({tokens: [card]})).toBe(null);
    expect(
      renderToStaticMarkup(
        h(BreakpointStyles, {tokens: [breakpoints<ViewStyle>({})]}),
      ),
    ).toBe('');
  });
});
