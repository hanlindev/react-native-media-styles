# @react-native-media-styles/babel-plugin

Optional Babel 7 plugin. It inserts core `BreakpointStyles` for components that call `useBreakpointStyle` or `useBreakpointStyles` directly. It expects the same React 19 web setup as core, and it does not pull in another runtime package.

## Expo setup

```sh
pnpm add -D @react-native-media-styles/babel-plugin babel-preset-expo
```

Add the plugin to the Babel config:

```ts
// babel.config.cts
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: ['@react-native-media-styles/babel-plugin'],
};
```

## Hooks without a companion

```tsx
import {View, type ViewStyle} from 'react-native';
import {
  breakpoints,
  useBreakpointStyles,
} from '@react-native-media-styles/core';

const card = breakpoints<ViewStyle>({base: {padding: 24}});
const roomy = breakpoints<ViewStyle>({'(min-width: 800px)': {padding: 40}});

export function Card({expanded}: {expanded: boolean}) {
  const {style} = useBreakpointStyles([card, expanded && roomy]);
  return <View style={style} />;
}
```

The plugin records the combined token and wraps the return value in a fragment that includes the companion. An inline `useBreakpointStyle(token)` call works the same way. Token expressions run once, and collection stays inside that render. A lazy component's resources stay inside its own Suspense boundary. Core still owns stylesheet identity and deduping. Nothing is imported eagerly, and nothing is extracted into a global sheet.

The plugin matches imports from `@react-native-media-styles/core` by binding: named, aliased, and namespace imports all count. A different function with the same name, or a shadowed binding, is left alone. TypeScript and JSX components work, including `memo` and `forwardRef` callbacks that return JSX.

A parent that requires a single child clones the element before render, so `Children.only`, slots, refs, and events still work. Forward that parent's props and ref to your host element. Browser tests cover plain DOM nodes and Metro-adapted RNW components. Render the component from JSX. The transformed function returns the resource siblings next to the element.

Companions need an HTML render context. For a component that renders inside SVG, put a manual companion on an HTML ancestor and skip that file with a Babel override. React treats a style element inside SVG as SVG content, so it will not hoist it as an HTML resource.

## Scope

Call the supported hooks in the component itself. A call inside a custom hook, or behind a re-exported wrapper, is not found. Those components still need an explicit companion. The plugin transforms uppercase component functions and any function that contains JSX. Manual companions can stay during a migration: React dedupes the token, so the extra one is only redundant.

The [Expo demo](../../examples/expo/README.md) enables this plugin and uses both hooks with no manual companions. The plugin does not merge separate responsive entries in a style array. Use `useBreakpointStyles` for that.
