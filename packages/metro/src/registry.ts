import {sheetResources} from './resources';

type Resource = ReturnType<typeof sheetResources>[number];

export function createRuleRegistry() {
  const seen = new Set<string>();
  const globals: Resource[] = [];
  const byClass = new Map<string, Resource[]>();
  function add(resources: Resource[]) {
    for (const resource of resources) {
      if (seen.has(resource.id)) continue;
      seen.add(resource.id);
      if (!resource.classes.length) globals.push(resource);
      for (const name of resource.classes) {
        const entries = byClass.get(name) ?? [];
        entries.push(resource);
        byClass.set(name, entries);
      }
    }
  }
  add(sheetResources(''));
  return {
    hydrate(css: string) {
      add(sheetResources(css));
    },
    insert(css: string, group: number) {
      add(sheetResources(`[stylesheet-group="${group}"]{}\n${css}`));
    },
    select(className: string) {
      const resources = new Set(globals);
      for (const name of className.split(/\s+/)) {
        for (const resource of byClass.get(name) ?? []) resources.add(resource);
      }
      return [...resources];
    },
  };
}

// This index records registered rules, not which resources a request emitted.
// Every element, request and resumed boundary declares its own dependencies.
export const registry = createRuleRegistry();
