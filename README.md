# react-native-media-styles

Responsive styles for React Native and React Native Web, with colocated definitions and stylesheet delivery for SSR, streaming, and client navigation.

- [`@react-native-media-styles/core`](./packages/core/README.md): breakpoint tokens, hooks, composition, and stylesheet companions.
- [`@react-native-media-styles/metro`](./packages/metro/README.md): Metro integration for React Native Web styles registered by routes and lazy components.
- [`@react-native-media-styles/babel-plugin`](./packages/babel-plugin/README.md): optional automatic stylesheet companions for breakpoint hooks.
- [`Expo Router demo`](./examples/expo/README.md): a working integration using all three packages. The demo is private and excluded from npm packages.

## Install

Install core in your React Native app. For the Expo/Metro web integration, install both:

```sh
pnpm add @react-native-media-styles/core @react-native-media-styles/metro
```

The web integration requires React 19 and React Native Web 0.21. Expo Router on SDK 57 is the tested setup. Native-only apps can use core without the Metro adapter.

## Define responsive styles

Keep a token beside its component, use the hook for its style, and render its stylesheet companion:

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

On web, the companion delivers the token's media-query CSS. On native, the hook resolves matching styles and the companion returns `null`. Keep a lazy component's companion inside its Suspense boundary so its styles arrive with its content.

See the [core documentation](./packages/core/README.md) for supported properties, queries, and combining tokens with `useBreakpointStyles`.

## Automatic stylesheet companions (optional)

To omit manual `BreakpointStyles` elements, install the Babel plugin:

```sh
pnpm add -D @react-native-media-styles/babel-plugin babel-preset-expo
```

Enable it in your Expo Babel config:

```ts
// babel.config.cts
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: ['@react-native-media-styles/babel-plugin'],
};
```

Components using `useBreakpointStyle` or `useBreakpointStyles` directly can now return their content without a companion; the plugin inserts one inside the component's render boundary. Calls hidden behind custom hooks or re-exported wrappers still need manual companions; see the [plugin documentation](./packages/babel-plugin/README.md).

## Configure Expo / Metro

Wrap your existing Metro config with `withMediaStyles`, applying it after other wrappers:

```ts
// metro.config.cts
const {getDefaultConfig} = require('expo/metro-config');
const {withMediaStyles} = require('@react-native-media-styles/metro');

module.exports = withMediaStyles(getDefaultConfig(__dirname));
```

Restart Metro after changing its configuration. The adapter delivers ordinary React Native Web `StyleSheet.create` rules, including those registered by lazy modules, before their streamed content becomes visible. Continue using core companions for responsive tokens.

The styling integration requires no eager style import list or manual stylesheet injection in the server document. The Babel plugin is optional.

See the [Metro documentation](./packages/metro/README.md) for compatibility and SSR details, and the [demo walkthrough](./examples/expo/README.md) to see the actual integration in this repository.

## Run the demo

From this repository, use Node 24+ and the pinned pnpm version:

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
```

Root commands check the packages and demo tooling. To run a core command directly, use `pnpm --filter @react-native-media-styles/core <command>`.
