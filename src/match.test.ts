import {describe, expect, it} from 'vitest';
import type {ViewStyle} from 'react-native';

import {breakpointEntries, mergeBreakpointStyles} from './merge';
import {queryMatches} from './match';

import type {MediaEnvironment} from './types';

const env: MediaEnvironment = {
  width: 800,
  height: 600,
  colorScheme: 'light',
};

describe('native media matching', () => {
  it('matches width ranges, orientation, and color scheme combined with and', () => {
    expect(queryMatches('(min-width: 600px) and (max-width: 999px)', env)).toBe(
      true,
    );
    expect(queryMatches('(min-width: 1000px)', env)).toBe(false);
    expect(queryMatches('(width: 800px)', env)).toBe(true);
    expect(
      queryMatches('(orientation: landscape) and (max-width: 900px)', env),
    ).toBe(true);
    expect(queryMatches('(orientation: portrait)', env)).toBe(false);
    expect(
      queryMatches('(prefers-color-scheme: dark) and (min-width: 600px)', {
        ...env,
        colorScheme: 'dark',
      }),
    ).toBe(true);
    expect(queryMatches('(prefers-color-scheme: dark)', env)).toBe(false);
  });

  it('leaves queries outside the native set unmatched', () => {
    expect(queryMatches('(min-resolution: 2dppx)', env)).toBe(false);
    expect(
      queryMatches('(min-width: 600px), (orientation: portrait)', env),
    ).toBe(false);
    expect(queryMatches('not (max-width: 900px)', env)).toBe(false);
  });

  it('starts from base and lets later matching queries override', () => {
    const entries = breakpointEntries<ViewStyle>({
      '(min-width: 1000px)': {width: '31%'},
      base: {width: '100%', padding: 16},
      '(min-width: 600px) and (max-width: 999px)': {width: '47%'},
      '(orientation: landscape) and (max-width: 900px)': {width: '47%'},
    });
    expect(mergeBreakpointStyles(entries, env)).toEqual({
      width: '47%',
      padding: 16,
    });
    expect(
      mergeBreakpointStyles(entries, {...env, width: 390, height: 800}),
    ).toEqual({
      width: '100%',
      padding: 16,
    });
    expect(
      mergeBreakpointStyles(entries, {...env, width: 1200, height: 800}),
    ).toEqual({
      width: '31%',
      padding: 16,
    });
  });

  it('applies longhands after shorthands inside one query', () => {
    const merged = mergeBreakpointStyles(
      breakpointEntries<ViewStyle>({
        base: {paddingLeft: 8, padding: 16},
      }),
      env,
    );
    expect(merged).toEqual({padding: 16, paddingLeft: 8});
    expect(Object.keys(merged ?? {})).toEqual(['padding', 'paddingLeft']);
  });

  it('keeps an earlier value when a later query sets that property to undefined', () => {
    const entries = breakpointEntries<ViewStyle>({
      base: {width: '100%', padding: 16},
      '(min-width: 600px)': {width: undefined, paddingLeft: 8},
    });
    expect(mergeBreakpointStyles(entries, env)).toEqual({
      width: '100%',
      padding: 16,
      paddingLeft: 8,
    });
  });
});
