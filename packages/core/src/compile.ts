import {orderedStyleEntries} from './order';

const UNITLESS = new Set([
  'aspectRatio',
  'flexGrow',
  'flexShrink',
  'fontWeight',
  'opacity',
  'zIndex',
]);

export type AtomicRule = {property: string; className: string; rule: string};

export function compileAtomic(style: object, scope: string): AtomicRule[] {
  return orderedStyleEntries(style).map(([property, value], index) => {
    const cssValue =
      typeof value === 'number' && value !== 0 && !UNITLESS.has(property)
        ? `${value}px`
        : String(value);
    const className = `b-${scope}-${index}`;
    const cssProperty = property.replace(
      /[A-Z]/g,
      (letter) => `-${letter.toLowerCase()}`,
    );
    return {
      property,
      className,
      // Three classes outrank Metro's doubled RNW classes in either sheet
      // order. All responsive queries retain equal specificity; inline styles
      // remain the explicit override.
      rule: `.${className}.${className}.${className}{${cssProperty}:${cssValue}}`,
    };
  });
}

export function hash(value: string): string {
  let left = 0xdeadbeef;
  let right = 0x41c6ce57;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    left = Math.imul(left ^ code, 2654435761);
    right = Math.imul(right ^ code, 1597334677);
  }
  left =
    Math.imul(left ^ (left >>> 16), 2246822507) ^
    Math.imul(right ^ (right >>> 13), 3266489909);
  right =
    Math.imul(right ^ (right >>> 16), 2246822507) ^
    Math.imul(left ^ (left >>> 13), 3266489909);
  return (left >>> 0).toString(36) + '-' + (right >>> 0).toString(36);
}
