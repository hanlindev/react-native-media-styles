const SHORTHANDS = new Set([
  'border',
  'borderColor',
  'borderRadius',
  'borderStyle',
  'borderWidth',
  'display',
  'flex',
  'gap',
  'inset',
  'margin',
  'overflow',
  'overscrollBehavior',
  'padding',
]);

const AXES = new Set([
  'insetBlock',
  'insetInline',
  'marginBlock',
  'marginHorizontal',
  'marginInline',
  'marginVertical',
  'paddingBlock',
  'paddingHorizontal',
  'paddingInline',
  'paddingVertical',
]);

export function styleOrder(property: string): number {
  if (SHORTHANDS.has(property)) return 0;
  if (AXES.has(property)) return 1;
  return 2;
}

export function orderedStyleEntries(style: object): [string, unknown][] {
  return Object.entries(style)
    .filter((entry) => entry[1] != null)
    .sort(([left], [right]) => {
      const order = styleOrder(left) - styleOrder(right);
      if (order !== 0) return order;
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    });
}
