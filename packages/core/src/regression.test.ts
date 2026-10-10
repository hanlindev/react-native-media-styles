import {describe, expect, it} from 'vitest';
import type {ViewStyle} from 'react-native';
import {breakpoints} from './breakpoints.web';
import {mergeBreakpointStyles} from './merge';
import {getBreakpointSheet} from './sheet';

const env = {
  width: 800,
  height: 600,
  colorScheme: 'light',
} satisfies Parameters<typeof mergeBreakpointStyles>[1];

describe('normalized tokens', () => {
  it('isolates opposite query orders across tokens and deduplicates whole tokens', () => {
    const a = breakpoints<ViewStyle>({
      '(min-width: 600px)': {width: 100},
      '(orientation: landscape)': {width: 200},
    });
    const b = breakpoints<ViewStyle>({
      '(orientation: landscape)': {width: 200},
      '(min-width: 600px)': {width: 100},
    });
    const classes = (style: unknown) =>
      Object.values(Object(style)).filter((value) => typeof value === 'string');
    expect(
      classes(a.style).some((value) => classes(b.style).includes(value)),
    ).toBe(false);
    const sheet = getBreakpointSheet([a, b]);
    for (const token of [a, b]) {
      const positions = classes(token.style).map((name) =>
        sheet.indexOf(`.${name}{`),
      );
      expect(positions[0]).toBeGreaterThanOrEqual(0);
      expect(positions[0]).toBeLessThan(positions[1]);
    }
    expect(mergeBreakpointStyles(a.entries, env)?.width).toBe(200);
    expect(mergeBreakpointStyles(b.entries, env)?.width).toBe(100);
    const again = breakpoints<ViewStyle>({
      '(min-width: 600px)': {width: 100},
      '(orientation: landscape)': {width: 200},
    });
    expect(again.style).toEqual(a.style);
    expect(getBreakpointSheet([a, b, again])).toBe(sheet);
  });

  it('gives explicit edges precedence regardless of input property order', () => {
    const a = breakpoints<ViewStyle>({
      base: {paddingLeft: 8, paddingHorizontal: 16, padding: 20},
    });
    const b = breakpoints<ViewStyle>({
      base: {padding: 20, paddingHorizontal: 16, paddingLeft: 8},
    });
    expect(a).toEqual(b);
    expect(a.entries[0].style).toEqual({
      paddingLeft: 8,
      paddingRight: 16,
      paddingTop: 20,
      paddingBottom: 20,
    });
  });

  it('lets a later shorthand replace earlier edges on both platforms', () => {
    const token = breakpoints<ViewStyle>({
      base: {marginLeft: 8},
      '(min-width: 600px)': {margin: 20},
    });
    expect(mergeBreakpointStyles(token.entries, env)?.marginLeft).toBe(20);
    const sheet = getBreakpointSheet([token]);
    const classes = Object.values(Object(token.style)).filter(
      (value) => typeof value === 'string',
    );
    const rules = classes.map(
      (name) => sheet.match(new RegExp(`\\.${name}\\{([^}]+)\\}`))?.[1],
    );
    expect(rules.filter((rule) => rule?.startsWith('margin-left:'))).toEqual([
      'margin-left:8px',
      'margin-left:20px',
    ]);
  });

  it('copies and freezes inputs so later mutation cannot change native results', () => {
    const style = {width: 123};
    const token = breakpoints<ViewStyle>({base: style});
    style.width = 456;
    expect(mergeBreakpointStyles(token.entries, env)?.width).toBe(123);
    for (const value of [
      token,
      token.entries,
      token.entries[0],
      token.entries[0].style,
      token.style,
    ]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
  });

  it('normalizes flex and gap and preserves units for text and layout', () => {
    const token = breakpoints<ViewStyle>({
      base: {flex: 2, flexShrink: 1, gap: 4, rowGap: 8, opacity: 0.5},
    });
    expect(token.entries[0].style).toEqual({
      flexGrow: 2,
      flexShrink: 1,
      flexBasis: 0,
      columnGap: 4,
      rowGap: 8,
      opacity: 0.5,
    });
    expect(getBreakpointSheet([token])).toContain('flex-grow:2}');
    expect(getBreakpointSheet([token])).toContain('row-gap:8px}');
  });

  it.each([
    [1, 1, 0, 0],
    [2, 2, 0, 0],
    [0, 0, 0, 'auto'],
    [-1, 0, 1, 'auto'],
    [-2, 0, 2, 'auto'],
  ])(
    'normalizes unmasked flex %s using Yoga shorthand values',
    (flex, grow, shrink, basis) => {
      const token = breakpoints<ViewStyle>({base: {flex: Number(flex)}});
      expect(token.entries[0].style).toEqual({
        flexGrow: grow,
        flexShrink: shrink,
        flexBasis: basis,
      });
      const css = getBreakpointSheet([token]);
      expect(css).toContain(`flex-grow:${grow}}`);
      expect(css).toContain(`flex-shrink:${shrink}}`);
      expect(css).toContain(`flex-basis:${basis}}`);
    },
  );

  it('allows explicit flex longhands to override shorthand regardless of property order', () => {
    for (const style of [
      {flex: 1, flexShrink: 1, flexGrow: 3, flexBasis: 80},
      {flexShrink: 1, flexGrow: 3, flexBasis: 80, flex: 1},
    ]) {
      const token = breakpoints<ViewStyle>({base: style});
      expect(token.entries[0].style).toEqual({
        flexGrow: 3,
        flexShrink: 1,
        flexBasis: 80,
      });
    }
  });
});
