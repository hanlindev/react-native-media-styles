import {compileAtomic, hash} from './compile';
import {breakpointEntries} from './merge';
import {setTokenResource} from './resources';
import {useComposedToken} from './composition';
import {orderedStyleEntries} from './order';

import type {StyleProp, ViewStyle} from 'react-native';
import type {
  BreakpointMap,
  BreakpointToken,
  ComponentStyle,
  MediaStyle,
  BreakpointEntry,
  BreakpointStyleInput,
  ComposedBreakpointStyle,
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
  return createToken(entries);
}

function createToken<T extends MediaStyle>(
  entries: readonly BreakpointEntry<T>[],
): BreakpointToken<T>;
function createToken(
  entries: readonly BreakpointEntry<MediaStyle>[],
): BreakpointToken<MediaStyle> {
  const compiled: WebAtomicStyle = {$$css: true};
  // Hash the same declaration order used by the compiler, regardless of how
  // composition inserted properties. Query order remains significant.
  const identity = JSON.stringify(
    entries.map(({query, style}) => ({
      query,
      style: Object.fromEntries(orderedStyleEntries(style)),
    })),
  );
  const scope = hash(`rnms-v2:${identity}`);
  const rules: string[] = [];
  for (const [index, entry] of entries.entries()) {
    for (const rule of compileAtomic(entry.style, `${scope}-${index}`)) {
      rules.push(
        entry.query == null ? rule.rule : `@media ${entry.query}{${rule.rule}}`,
      );
      compiled[`__b${scope}_${index}_${rule.property}`] = rule.className;
    }
  }
  const token = Object.freeze({
    entries,
    style: Object.freeze(compiled),
  });
  setTokenResource(token, {id: `rnms-v2-${scope}`, css: rules.join('')});
  return token;
}

export function useBreakpointStyle<T>(
  token: BreakpointToken<T>,
): StyleProp<ComponentStyle<T>> {
  return token.style;
}

export function useBreakpointStyles<T extends MediaStyle>(
  tokens: readonly BreakpointStyleInput<T>[],
): ComposedBreakpointStyle<T> {
  const token = useComposedToken(tokens, createToken<T>);
  return {token, style: useBreakpointStyle(token)};
}
