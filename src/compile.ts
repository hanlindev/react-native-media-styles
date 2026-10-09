import {orderedStyleEntries} from './order';

const AXES: Record<string, readonly [string, string]> = {
  marginHorizontal: ['marginLeft', 'marginRight'],
  marginVertical: ['marginTop', 'marginBottom'],
  paddingHorizontal: ['paddingLeft', 'paddingRight'],
  paddingVertical: ['paddingTop', 'paddingBottom'],
};

const UNITLESS = new Set([
  'aspectRatio',
  'flex',
  'flexGrow',
  'flexShrink',
  'fontWeight',
  'opacity',
  'order',
  'zIndex',
]);

export type AtomicRule = {
  property: string;
  className: string;
  rule: string;
};

export function compileAtomic(
  style: object,
  query: string | null,
): AtomicRule[] {
  return orderedStyleEntries(expandAxes(style)).flatMap(([property, value]) => {
    const cssValue = toCssValue(property, value);
    if (cssValue == null) return [];
    const className = `b-${hash(`${query ?? ''}:${property}:${cssValue}`)}`;
    return [
      {
        property,
        className,
        rule: `.${className}{${hyphenate(property)}:${cssValue}}`,
      },
    ];
  });
}

function expandAxes(style: object): object {
  const expanded: Record<string, unknown> = {};
  for (const [property, value] of Object.entries(style)) {
    const axis = AXES[property];
    if (axis == null) {
      expanded[property] = value;
      continue;
    }
    expanded[axis[0]] = value;
    expanded[axis[1]] = value;
  }
  return expanded;
}

function toCssValue(property: string, value: unknown): string | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    if (value === 0 || UNITLESS.has(property)) return String(value);
    return `${value}px`;
  }
  if (typeof value === 'string') {
    if (value.length === 0 || /[{}<>]/.test(value) || /[\n\r]/.test(value))
      return null;
    return value;
  }
  return null;
}

function hyphenate(property: string): string {
  return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function hash(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) + hash + value.charCodeAt(index);
    hash |= 0;
  }
  return (hash >>> 0).toString(36);
}
