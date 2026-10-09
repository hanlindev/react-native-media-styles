const seen = new Set<string>();
const rules: {query: string | null; rule: string}[] = [];

export function registerAtomic(
  query: string | null,
  rule: {className: string; rule: string},
): void {
  const key = `${query ?? ''}\0${rule.className}`;
  if (seen.has(key)) return;
  seen.add(key);
  rules.push({query, rule: rule.rule});
}

export function getBreakpointSheet(): string {
  return rules
    .map(({query, rule}) => (query == null ? rule : `@media ${query}{${rule}}`))
    .join('');
}
