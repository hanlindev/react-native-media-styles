# @react-native-media-styles/babel-plugin

Optional Babel 7 plugin that inserts core `BreakpointStyles` companions for React components using `useBreakpointStyle` or `useBreakpointStyles` directly. Requires the same React 19 web setup as core; it adds no runtime package beyond core.

## Expo setup

```sh
pnpm add -D @react-native-media-styles/babel-plugin babel-preset-expo
```

Add the plugin to your existing Babel configuration:

```ts
// babel.config.cts
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: ['@react-native-media-styles/babel-plugin'],
};
```

Restart Metro with its cache cleared after enabling the plugin. Keep `withMediaStyles` in your Metro config to deliver ordinary React Native Web styles.

## Use the hooks without companions

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

The plugin records the combined token and wraps the component's result in a fragment containing its companion. Inline `useBreakpointStyle(token)` calls work too. Token expressions are evaluated once, and collection is local to each render. Lazy components deliver their resources inside their own Suspense boundaries. Core still owns stylesheet identity and deduplication; nothing is eagerly imported or extracted to a global stylesheet.

Named, aliased, and namespace imports from `@react-native-media-styles/core` are recognized by their bindings. Unrelated or shadowed functions are unchanged. TypeScript/JSX components and memo/forwardRef callbacks with JSX are supported.

## Scope

Use the supported hooks directly in the component. Hook calls hidden behind custom hooks or re-exported wrappers are not discovered; retain explicit companions for those cases. Uppercase component functions and functions containing JSX are transformed. Existing manual companions can coexist during migration because React deduplicates token resources, though they are redundant in transformed components.

The [Expo demo](../../examples/expo/README.md) enables this plugin and uses both hooks without manual companions. The plugin does not compose separate responsive style-array entries; use `useBreakpointStyles` for token merging.
