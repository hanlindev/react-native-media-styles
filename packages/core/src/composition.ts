import {useRef} from 'react';
import type {
  BreakpointEntry,
  BreakpointStyleInput,
  BreakpointToken,
} from './types';

/** Merge identical queries; base first, then queries in first-appearance order. */
export function composeEntries<T>(
  inputs: readonly BreakpointStyleInput<T>[],
): readonly BreakpointEntry<T>[] {
  const styles = new Map<string | null, T>();
  for (const input of inputs) {
    if (input == null || typeof input === 'boolean') continue;
    for (const {query, style} of input.entries) {
      const previous = styles.get(query);
      styles.set(query, previous == null ? style : {...previous, ...style});
    }
  }
  const queries = [...styles.keys()];
  const ordered = styles.has(null)
    ? [null, ...queries.filter((query) => query !== null)]
    : queries;
  return Object.freeze(
    ordered.map((query) =>
      Object.freeze({
        query,
        style: Object.freeze(styles.get(query)!),
      }),
    ),
  );
}

export function useComposedToken<T>(
  inputs: readonly BreakpointStyleInput<T>[],
  create: (entries: readonly BreakpointEntry<T>[]) => BreakpointToken<T>,
): BreakpointToken<T> {
  const active = inputs.filter(
    (input): input is BreakpointToken<T> =>
      input != null && typeof input !== 'boolean',
  );
  const previous = useRef<{
    inputs: readonly BreakpointToken<T>[];
    token: BreakpointToken<T>;
  } | null>(null);
  if (
    previous.current == null ||
    active.length !== previous.current.inputs.length ||
    active.some((token, index) => token !== previous.current!.inputs[index])
  ) {
    previous.current = {inputs: active, token: create(composeEntries(active))};
  }
  return previous.current.token;
}
