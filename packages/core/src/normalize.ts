import {orderedStyleEntries} from './order';

const EXPANSIONS: Record<string, readonly string[]> = {
  margin: ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'],
  marginHorizontal: ['marginLeft', 'marginRight'],
  marginVertical: ['marginTop', 'marginBottom'],
  padding: ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
  paddingHorizontal: ['paddingLeft', 'paddingRight'],
  paddingVertical: ['paddingTop', 'paddingBottom'],
  gap: ['rowGap', 'columnGap'],
  inset: ['top', 'right', 'bottom', 'left'],
};

export function normalizeStyle<T>(style: T): T;
export function normalizeStyle(style: object): object {
  const result: Record<string, unknown> = {};
  for (const [property, value] of orderedStyleEntries(style)) {
    // Match Yoga with useWebDefaults=false, as used by native React Native.
    // Emit explicit longhands so both platforms use the same values.
    if (property === 'flex') {
      const flex = Number(value);
      result.flexGrow = flex > 0 ? flex : 0;
      result.flexShrink = flex < 0 ? -flex : 0;
      result.flexBasis = flex > 0 ? 0 : 'auto';
      continue;
    }
    for (const target of EXPANSIONS[property] ?? [property])
      result[target] = value;
  }
  return Object.freeze(Object.fromEntries(orderedStyleEntries(result)));
}
