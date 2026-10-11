import {createElement, Fragment} from 'react';
import originalCreateElement from '@react-native-media-styles/metro/original-create-element';
import StyleSheet from 'react-native-web/dist/exports/StyleSheet';
import {sheetResources} from './resources';

let lastCSS: string | undefined;
let resources: ReturnType<typeof sheetResources> = [];

export default function createStyledElement(
  component: unknown,
  props: unknown,
  options?: unknown,
) {
  // Resolve first: RNW may register rules while resolving DOM props.
  const element = originalCreateElement(component, props, options);
  const css = StyleSheet.getSheet().textContent;
  if (css !== lastCSS) {
    resources = sheetResources(css);
    lastCSS = css;
  }
  return createElement(
    Fragment,
    null,
    ...resources.map((resource) =>
      createElement(
        'style',
        {
          key: resource.id,
          href: resource.id,
          precedence: resource.precedence,
        },
        resource.css,
      ),
    ),
    element,
  );
}
