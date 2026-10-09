import {assertValidMediaQuery, queryMatches} from './match';
import {orderedStyleEntries} from './order';

import type {BreakpointEntry, MediaEnvironment, MediaStyle} from './types';

export function mergeBreakpointStyles<T extends MediaStyle>(
  entries: readonly BreakpointEntry<T>[],
  env: MediaEnvironment,
): T | undefined {
  let merged: T | undefined;
  for (const entry of entries) {
    if (entry.query != null && !queryMatches(entry.query, env)) continue;
    const ordered = definedStyle(entry.style);
    merged = merged == null ? ordered : {...merged, ...ordered};
  }
  return merged;
}

function definedStyle<T extends MediaStyle>(style: T): T;
function definedStyle(style: MediaStyle): MediaStyle {
  return Object.fromEntries(orderedStyleEntries(style));
}

export function breakpointEntries<T>(styles: {
  [query: string]: T | undefined;
  base?: T;
}): BreakpointEntry<T>[] {
  const entries: BreakpointEntry<T>[] = [];
  if (styles.base != null) entries.push({query: null, style: styles.base});
  for (const query of Object.keys(styles)) {
    if (query === 'base') continue;
    const style = styles[query];
    if (style == null) continue;
    assertValidMediaQuery(query);
    entries.push({query, style});
  }
  return entries;
}
