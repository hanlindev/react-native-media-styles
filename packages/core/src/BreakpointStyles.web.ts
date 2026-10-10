import {createElement, Fragment} from 'react';
import {getTokenResource} from './resources';
import type {BreakpointStylesProps} from './types';

/** Declare resources in the same component/Suspense boundary as their consumers. */
export function BreakpointStyles({tokens}: BreakpointStylesProps) {
  const resources = new Map(
    tokens.map((token) => {
      const resource = getTokenResource(token);
      return [resource.id, resource] as const;
    }),
  );
  // Always return the resources. React, not a render-time "emitted" set, owns
  // deduplication across retries, aborted work, hydration and late boundaries.
  return createElement(
    Fragment,
    null,
    ...[...resources.values()]
      .filter((resource) => resource.css !== '')
      .map((resource) =>
        createElement(
          'style',
          {
            key: resource.id,
            href: resource.id,
            precedence: 'react-native-media-styles',
          },
          resource.css,
        ),
      ),
  );
}
