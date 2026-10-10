import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import type {ViewStyle} from 'react-native';
import {breakpoints, useBreakpointStyles} from './breakpoints.web';
import {BreakpointStyles} from './BreakpointStyles.web';
import {composeEntries} from './composition';
import {mergeBreakpointStyles} from './merge';
import {getBreakpointSheet} from './sheet';
import type {BreakpointStyleInput, ComposedBreakpointStyle} from './types';

const first = breakpoints<ViewStyle>({
  base: {padding: 16, opacity: 0.5},
  '(min-width: 800px)': {padding: 32},
});
const later = breakpoints<ViewStyle>({
  '(min-width: 800px)': {padding: 24},
});

function compose(...inputs: BreakpointStyleInput<ViewStyle>[]) {
  let result: ComposedBreakpointStyle<ViewStyle> | undefined;
  function App() {
    result = useBreakpointStyles(inputs);
    return h(BreakpointStyles, {tokens: [result.token]});
  }
  const html = renderToStaticMarkup(h(App));
  return {result: result!, html};
}

describe('ordered token composition', () => {
  it('keeps earlier fallbacks and overrides only matching later declarations', () => {
    const {result, html} = compose(first, false, null, later, true, undefined);
    const entries = result.token.entries;
    const narrow = mergeBreakpointStyles(entries, {
      width: 390,
      height: 900,
      colorScheme: null,
    });
    const wide = mergeBreakpointStyles(entries, {
      width: 1000,
      height: 900,
      colorScheme: null,
    });
    expect(narrow).toMatchObject({paddingLeft: 16, opacity: 0.5});
    expect(wide).toMatchObject({paddingLeft: 24, opacity: 0.5});
    const css = getBreakpointSheet([result.token]);
    expect(entries).toHaveLength(2);
    expect(css).not.toContain('padding-left:32px');
    expect(css).toContain('padding-left:24px');
    expect(html).toContain(css);
  });

  it('puts merged base first and lets later arguments win within identical queries', () => {
    const forward = compose(first, later).result.token;
    const reverse = compose(later, first).result.token;
    expect(reverse.entries.at(-2)?.query).toBe(null);
    expect(
      mergeBreakpointStyles(reverse.entries, {
        width: 390,
        height: 900,
        colorScheme: null,
      }),
    ).toMatchObject({paddingLeft: 16});
    expect(
      mergeBreakpointStyles(reverse.entries, {
        width: 1000,
        height: 900,
        colorScheme: null,
      }),
    ).toMatchObject({paddingLeft: 32});
    expect(getBreakpointSheet([forward])).not.toBe(
      getBreakpointSheet([reverse]),
    );
    expect(getBreakpointSheet([forward])).toBe(
      getBreakpointSheet([compose(first, later).result.token]),
    );
  });

  it('retains responsive overrides when a later argument only defines base', () => {
    const regular = breakpoints<ViewStyle>({base: {padding: 16}});
    const roomy = breakpoints<ViewStyle>({'(min-width: 800px)': {padding: 24}});
    const forward = compose(regular, roomy).result.token;
    const reverse = compose(roomy, regular).result.token;
    expect(reverse.entries[0]?.query).toBe(null);
    expect(getBreakpointSheet([forward])).toBe(getBreakpointSheet([reverse]));
    expect(
      mergeBreakpointStyles(reverse.entries, {
        width: 1000,
        height: 900,
        colorScheme: null,
      }),
    ).toMatchObject({paddingLeft: 24});
  });

  it('merges normalized edges and ignores nullish declarations without mutating inputs', () => {
    const second = breakpoints<ViewStyle>({
      base: {paddingLeft: 8, opacity: undefined},
      '(min-width: 800px)': {opacity: 1},
    });
    const merged = compose(first, second).result.token;
    expect(merged.entries[0]?.style).toMatchObject({
      paddingLeft: 8,
      paddingRight: 16,
      opacity: 0.5,
    });
    expect(merged.entries[1]?.style).toMatchObject({
      paddingLeft: 32,
      opacity: 1,
    });
    expect(first.entries[0]?.style).toMatchObject({
      paddingLeft: 16,
      opacity: 0.5,
    });
    expect(Object.isFrozen(merged.entries)).toBe(true);
    expect(Object.isFrozen(merged.entries[0])).toBe(true);
    expect(Object.isFrozen(merged.entries[0]?.style)).toBe(true);
    const shorthand = breakpoints<ViewStyle>({base: {padding: 4}});
    expect(
      compose(second, shorthand).result.token.entries[0]?.style,
    ).toMatchObject({paddingLeft: 4, paddingRight: 4});
  });

  it('preserves first-appearance query order when a query is repeated later', () => {
    const other = breakpoints<ViewStyle>({'(min-width: 900px)': {padding: 40}});
    const merged = compose(first, other, later).result.token;
    expect(merged.entries.map((entry) => entry.query)).toEqual([
      null,
      '(min-width: 800px)',
      '(min-width: 900px)',
    ]);
    expect(
      mergeBreakpointStyles(merged.entries, {
        width: 1000,
        height: 900,
        colorScheme: null,
      }),
    ).toMatchObject({paddingLeft: 40});
    const css = getBreakpointSheet([merged]);
    expect(css.indexOf('(min-width: 800px)')).toBeLessThan(
      css.indexOf('(min-width: 900px)'),
    );
  });

  it('ignores all conditional placeholders and supports an empty call', () => {
    expect(composeEntries([null, undefined, true, false])).toEqual([]);
    expect(compose().html).toBe('');
    expect(compose(false, true, undefined, null).result.token.entries).toEqual(
      [],
    );
  });

  it('deduplicates equivalent compositions independently of property insertion order', () => {
    const padding = breakpoints<ViewStyle>({base: {padding: 4}});
    const opacity = breakpoints<ViewStyle>({base: {opacity: 1}});
    const forward = compose(padding, opacity).result.token;
    const reverse = compose(opacity, padding).result.token;
    const direct = breakpoints<ViewStyle>({base: {padding: 4, opacity: 1}});
    const css = getBreakpointSheet([direct]);
    expect(getBreakpointSheet([forward])).toBe(css);
    expect(getBreakpointSheet([reverse])).toBe(css);
    expect(getBreakpointSheet([forward, reverse, direct])).toBe(css);
    const html = renderToStaticMarkup(
      h(BreakpointStyles, {tokens: [forward, reverse, direct]}),
    );
    expect(html.split(css)).toHaveLength(2);
    expect(html.match(/<style /g)).toHaveLength(1);
  });
});
