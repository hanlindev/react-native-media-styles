import {describe, expect, it} from 'vitest';
import type {TextStyle, ViewStyle} from 'react-native';

import {breakpoints} from './breakpoints';
import {getBreakpointSheet} from './sheet';

describe('atomic media styles', () => {
  it('emits one class per declaration and query', () => {
    const token = breakpoints<ViewStyle>({
      base: {width: '100%'},
      '(min-width: 600px) and (max-width: 999px)': {width: '47%'},
      '(min-width: 1000px)': {width: '31%'},
      '(orientation: landscape) and (max-width: 900px)': {width: '47%'},
    });
    const sheet = getBreakpointSheet([token]);
    const width100 = sheet.match(
      /\.b-[a-z0-9-]+\.b-[a-z0-9-]+\{width:100%\}/,
    )?.[0];
    const width47 = [
      ...sheet.matchAll(/\.b-[a-z0-9-]+\.b-[a-z0-9-]+\{width:47%\}/g),
    ].map((match) => match[0]);
    expect(width100).toBeDefined();
    expect(new Set(width47).size).toBe(2);
    expect(sheet.indexOf(width100!)).toBeLessThan(sheet.indexOf('@media'));
    expect(sheet).toContain(
      `@media (min-width: 600px) and (max-width: 999px){${width47[0]}}`,
    );
    expect(sheet).toContain(
      `@media (orientation: landscape) and (max-width: 900px){${width47[1]}}`,
    );
    expect(sheet).toContain('@media (min-width: 1000px){');
    expect(sheet.indexOf('(min-width: 1000px)')).toBeLessThan(
      sheet.indexOf('(orientation: landscape)'),
    );
  });

  it('keeps a base class distinct from the same declaration inside a query', () => {
    const first = breakpoints<ViewStyle>({
      base: {display: 'flex'},
      '(min-width: 900px)': {display: 'none'},
    });
    const second = breakpoints<ViewStyle>({
      base: {display: 'none'},
      '(min-width: 900px)': {display: 'flex'},
    });
    const sheet = getBreakpointSheet([first, second]);
    const flex = [
      ...sheet.matchAll(/\.b-[a-z0-9-]+\.b-[a-z0-9-]+\{display:flex\}/g),
    ].map((match) => match[0]);
    const none = [
      ...sheet.matchAll(/\.b-[a-z0-9-]+\.b-[a-z0-9-]+\{display:none\}/g),
    ].map((match) => match[0]);
    expect(new Set(flex).size).toBe(2);
    expect(new Set(none).size).toBe(2);
  });

  it('keeps a unique class key for each property and query', () => {
    const card = breakpoints<ViewStyle>({
      base: {width: '100%', padding: 16},
      '(min-width: 600px)': {width: '47%', paddingLeft: 8},
    });
    const compiled = classMap(card.style);
    const keys = Object.keys(compiled).filter((key) => key !== '$$css');
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.some((key) => key.endsWith('_0_width'))).toBe(true);
    expect(keys.some((key) => key.endsWith('_1_width'))).toBe(true);
    expect(keys.some((key) => key.endsWith('_1_paddingLeft'))).toBe(true);
    expect(
      Object.values(compiled).filter((value) => value !== true).length,
    ).toBe(keys.length);
  });

  it('emits shorthands before longhands and expands axis padding', () => {
    const token = breakpoints<ViewStyle>({
      base: {padding: 21, paddingHorizontal: 9},
    });
    const sheet = getBreakpointSheet([token]);
    const padding = sheet.indexOf('padding-top:21px');
    const paddingLeft = sheet.indexOf('padding-left:9px');
    const paddingRight = sheet.indexOf('padding-right:9px');
    expect(padding).toBeGreaterThanOrEqual(0);
    expect(paddingLeft).toBeGreaterThanOrEqual(0);
    expect(paddingRight).toBeGreaterThanOrEqual(0);
  });

  it('records a repeated declaration once for the same query', () => {
    const first = breakpoints<ViewStyle>({base: {opacity: 0.5}});
    const second = breakpoints<ViewStyle>({base: {opacity: 0.5}});
    const added = getBreakpointSheet([first, second]);
    expect(added.match(/opacity:0\.5/g)).toHaveLength(1);
  });

  it('throws an invalid media query before recording rules', () => {
    const queries = [
      '(min-width 600px)',
      '(min-width: 600)',
      '(min-width: 10em)',
      '(min-resolution: 2dppx)',
      '(hover: hover)',
      'not (max-width: 900px)',
      '(min-width: 600px), (orientation: portrait)',
      '(min-width: 600px) or (orientation: portrait)',
      'screen and (min-width: 600px)',
      '(orientation: square)',
      '(prefers-color-scheme: no-preference)',
      '',
    ];
    for (const query of queries) {
      expect(() =>
        breakpoints<ViewStyle>({
          base: {opacity: 0.25},
          [query]: {width: '50%'},
        }),
      ).toThrow(`Invalid media query: ${query}`);
      expect(getBreakpointSheet([])).toBe('');
    }
  });

  it('accepts text metrics on TextStyle', () => {
    const title = breakpoints<TextStyle>({
      base: {fontSize: 32, fontWeight: '700', lineHeight: 36.8},
    });
    expect(classMap(title.style).$$css).toBe(true);
  });
});

function classMap(style: unknown): Record<string, string | true> {
  if (style == null || typeof style !== 'object') {
    throw new Error('expected a compiled style');
  }
  const record: Record<string, string | true> = {};
  for (const [key, value] of Object.entries(style)) {
    if (typeof value === 'string' || value === true) record[key] = value;
  }
  if (record.$$css !== true) throw new Error('expected a compiled style');
  return record;
}
