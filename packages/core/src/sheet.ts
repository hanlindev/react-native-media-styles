import {getTokenResource} from './resources';
import type {BreakpointToken} from './types';

/** Explicit serialization for buffered/manual consumers; never a global registry. */
export function getBreakpointSheet(
  tokens: readonly BreakpointToken<unknown>[],
): string {
  const resources = new Map(
    tokens.map((token) => {
      const resource = getTokenResource(token);
      return [resource.id, resource.css] as const;
    }),
  );
  return [...resources.values()].join('');
}
