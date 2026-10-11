import {
  createElement,
  Fragment,
  isValidElement,
  type ReactElement,
} from 'react';
import originalCreateElement from 'react-native-web-streaming-styles/original-create-element';
import {registry} from './registry';

const elements = new WeakMap<object, ReturnType<typeof createElement>>();

export function elementClassName(element: ReactElement): string {
  let node: unknown = element;
  // RNW wraps elements with a writing direction in LocaleProvider. Preserve
  // that provider while reading the actual host element's generated classes.
  while (isValidElement<{className?: unknown; children?: unknown}>(node)) {
    if (typeof node.props.className === 'string') return node.props.className;
    node = node.props.children;
  }
  return '';
}

export default function createStyledElement(
  component: unknown,
  props: unknown,
  options?: unknown,
) {
  // Resolving DOM props can register additional rules in RNW's sheet.
  const element = originalCreateElement(component, props, options);
  const styles = registry.select(elementClassName(element)).map((resource) => {
    let style = elements.get(resource);
    if (!style) {
      style = createElement(
        'style',
        {key: resource.id, href: resource.id, precedence: resource.precedence},
        resource.css,
      );
      elements.set(resource, style);
    }
    return style;
  });
  // Keep the host in a stable position when its resource dependencies change.
  return createElement(
    Fragment,
    null,
    createElement(Fragment, null, styles),
    element,
  );
}
