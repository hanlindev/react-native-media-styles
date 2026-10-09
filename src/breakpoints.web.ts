import {compileAtomic} from './compile';
import {breakpointEntries} from './merge';
import {registerAtomic} from './sheet';

import type {StyleProp, ViewStyle} from 'react-native';
import type {
  BreakpointMap,
  BreakpointToken,
  ComponentStyle,
  MediaStyle,
} from './types';

type WebAtomicStyle = ComponentStyle<ViewStyle> & {
  $$css: true;
  [key: string]: unknown;
};

export function breakpoints<T extends MediaStyle = never>(
  styles: BreakpointMap<NoInfer<T>>,
): BreakpointToken<T>;
export function breakpoints(
  styles: BreakpointMap<MediaStyle>,
): BreakpointToken<MediaStyle> {
  const entries = breakpointEntries(styles);
  const compiled: WebAtomicStyle = {$$css: true};
  for (const entry of entries) {
    for (const rule of compileAtomic(entry.style, entry.query)) {
      registerAtomic(entry.query, rule);
      compiled[`${rule.property}\0${entry.query ?? 'base'}`] = rule.className;
    }
  }
  return {entries, style: compiled};
}

export function useBreakpointStyle<T>(
  token: BreakpointToken<T>,
): StyleProp<ComponentStyle<T>> {
  return token.style;
}
