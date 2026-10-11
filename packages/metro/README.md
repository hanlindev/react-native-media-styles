# @react-native-media-styles/metro

Metro adapter for streaming React Native Web stylesheet delivery. Requires React 19 and React Native Web 0.21. Expo Router on Expo SDK 57 is the tested setup; Expo is not a dependency. This adapter uses RNW internals; other RNW versions need verification before widening the supported range.

```sh
pnpm add @react-native-media-styles/metro
```

Wrap your existing Metro config. For Expo:

```ts
// metro.config.cts
const {getDefaultConfig} = require('expo/metro-config');
const {withMediaStyles} = require('@react-native-media-styles/metro');

module.exports = withMediaStyles(getDefaultConfig(__dirname));
```

Restart Metro after changing its configuration. The wrapper preserves your existing resolver; apply it last if you have other Metro wrappers. No style import list, custom document injection, Babel plugin, or component changes are required.

Continue using core `BreakpointStyles` companions for responsive tokens. This integration delivers ordinary RNW `StyleSheet.create` rules, including colors, borders and maximum widths that core does not serialize.

## How it works

Expo's streaming renderer captures RNW's stylesheet before rendering routes. A route or lazy component can register additional styles after that capture. The adapter wraps RNW's DOM element factory on web. After resolving an element's DOM props, it declares the current RNW stylesheet as immutable React 19 resources beside the element. React hoists the resources into the head and activates them before revealing a Suspense boundary. The stream does not wait for all components to load. The browser also declares resources, so new client rules retain the same specificity and precedence as server rules. RNW continues its normal CSS insertion. Native resolution is unchanged.

Snapshots have content-based identities and React deduplicates them per document. Each RNW precedence group has its own resource, with all groups established in order, so a late shorthand still precedes earlier longhands. Generated selectors repeat their class to outrank Expo's incomplete legacy RNW stylesheet regardless of head placement. Inline styles still override these rules. The adapter caches only parsed immutable snapshots; it does not track emitted resources globally or change rules during a render. Aborted renders and separate requests therefore declare their resources independently.

Snapshots include the rules registered in that server module graph, and can duplicate some CSS when new modules register rules during a stream. They do not eagerly import routes or disable client code splitting. React may retain resources after navigation. Avoid creating unbounded distinct `StyleSheet.create` definitions from request data; use inline styles for arbitrary dynamic values.

## Layout stability

Styles must have the same definitions on server and client. Correct CSS delivery prevents shifts caused by missing styles; it cannot prevent shifts caused by changing content or an application's hydration differences.

The [Expo demo](../../examples/expo/README.md) verifies first visible frame styles, delayed hydration, zero measured layout shift, streaming fallback/reveal, interactivity, and lazy navigation in development and production.
