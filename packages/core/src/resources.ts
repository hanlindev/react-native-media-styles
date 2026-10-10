import type {BreakpointToken} from './types';

type Resource = Readonly<{id: string; css: string}>;

// Metadata follows the token's lifetime. There is no process-wide used-style set.
const resources = new WeakMap<object, Resource>();

export function setTokenResource(token: object, resource: Resource): void {
  resources.set(token, Object.freeze(resource));
}

export function getTokenResource(token: BreakpointToken<unknown>): Resource {
  const resource = resources.get(token);
  if (resource == null)
    throw new Error('Expected a web token created by breakpoints()');
  return resource;
}
