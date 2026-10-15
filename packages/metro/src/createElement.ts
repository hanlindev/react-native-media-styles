import {
  Children,
  createElement,
  cloneElement,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import originalCreateElement from 'react-native-web-streaming-styles/original-create-element';
import {registry} from './registry';

const elements = new WeakMap<object, ReturnType<typeof createElement>>();

type ContainerProps = {
  children?: ReactNode;
  dangerouslySetInnerHTML?: unknown;
};

const leafHost =
  /^(area|base|br|col|embed|hr|img|input|link|meta|option|param|script|source|style|textarea|title|track|wbr)$/;

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
  // Containers declare resources beside their content, preserving the RNW host
  // and locale provider while responsive companions surround nested components.
  function attach(node: ReactElement<ContainerProps>): ReactElement {
    if (
      typeof node.type !== 'string' &&
      isValidElement<ContainerProps>(node.props.children)
    ) {
      return cloneElement(node, {children: attach(node.props.children)});
    }
    if (
      typeof node.type !== 'string' ||
      leafHost.test(node.type) ||
      node.props.dangerouslySetInnerHTML
    ) {
      return createElement(Fragment, null, styles, node);
    }
    const content = Children.toArray(node.props.children);
    // Resources and keyed content each occupy one stable array slot.
    return cloneElement(node, {children: [styles, content]});
  }
  return isValidElement<ContainerProps>(element) ? attach(element) : element;
}
