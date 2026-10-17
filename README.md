# react-native-media-styles

Media-query styles for React Native and React Native Web. When rendered on web, media query styles will be generated to use CSS for responsiveness. On native, the hooks will use JS to monitor screen sizes and return the corresponding style object.

- `[@react-native-media-styles/core](./packages/core/README.md)`: breakpoint tokens, hooks, composition, and stylesheet companions.
- `[react-native-web-streaming-styles](./packages/metro/README.md)`: Metro integration for React Native Web styles registered by routes and lazy components.
- `[@react-native-media-styles/babel-plugin](./packages/babel-plugin/README.md)`: optional plugin that inserts stylesheet companions for the breakpoint hooks.
- `[Expo Router demo](./examples/expo/README.md)`: a working app that uses all three packages. Private, and not published to npm.

## Install

Add core to a React Native app. The RNW setup needs both packages:

```sh
pnpm add @react-native-media-styles/core react-native-web-streaming-styles
```

## Define responsive styles

Define the token next to the component, read it with the hook, and render `BreakpointStyles` so the CSS is emitted:

```tsx
import {StyleSheet, View, type ViewStyle} from 'react-native';
import {
  BreakpointStyles,
  breakpoints,
  useBreakpointStyle,
} from '@react-native-media-styles/core';

const card = breakpoints<ViewStyle>({
  base: {padding: 24},
  '(min-width: 800px)': {padding: 40},
});
const styles = StyleSheet.create({
  card: {backgroundColor: '#dce9df', borderRadius: 12},
});

export function Card() {
  const responsiveStyle = useBreakpointStyle(card);
  return (
    <>
      <BreakpointStyles tokens={[card]} />
      <View style={[styles.card, responsiveStyle]} />
    </>
  );
}
```

On web, `BreakpointStyles` companion component writes the token's media-query CSS.

On native, the hook applies the queries that match, and the companion renders nothing.

If the component is lazy, render the companion inside its Suspense boundary so the CSS arrives with the content.

Supported properties, queries, and combining tokens with `useBreakpointStyles` are in the [core docs](./packages/core/README.md).

## Automatic stylesheet companions (optional)

To skip writing `BreakpointStyles` by hand, add the Babel plugin:

```sh
pnpm add -D @react-native-media-styles/babel-plugin babel-preset-expo
```

Enable it in the Expo Babel config:

```ts
// babel.config.cts
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: ['@react-native-media-styles/babel-plugin'],
};
```

A component that calls `useBreakpointStyle` or `useBreakpointStyles` itself can just return its content. The plugin inserts the companion inside the render. Calls inside a custom hook or a re-exported wrapper are not seen, so those still need a companion in the source. See the [plugin docs](./packages/babel-plugin/README.md).

## Configure Expo / Metro

Wrap the existing Metro config with `withStreamingStyles`. If there are other wrappers, apply this one last:

```ts
// metro.config.cts
const {getDefaultConfig} = require('expo/metro-config');
const {withStreamingStyles} = require('react-native-web-streaming-styles');

module.exports = withStreamingStyles(getDefaultConfig(__dirname));
```

See the [Metro docs](./packages/metro/README.md) for compatibility and SSR, and the [demo](./examples/expo/README.md) for the setup in this repo.

## Run the demo

From this repo, with Node 24+ and the pinned pnpm version:

```sh
pnpm install
pnpm demo:ssr                       # SSR web: http://localhost:8081
pnpm demo:spa                       # SPA web: http://localhost:8082
pnpm --dir examples/expo android     # Android emulator with Expo Go
```

## Development

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm test:package
pnpm test:install
pnpm benchmark:css
```
