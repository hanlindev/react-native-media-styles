# @react-native-media-styles/metro

Metro adapter for streaming React Native Web stylesheet delivery. Requires React 19 and React Native Web 0.21. This adapter uses RNW internals and is only verified against the RNW version in the dependency list. Newer RNW version will keep working unless the APIs change.

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

Expo's streaming renderer captures RNW's stylesheet before rendering routes. A route or lazy component can register additional styles after that capture. The adapter records rules as RNW inserts them and indexes them by generated class name. After resolving an element's DOM props, it declares that element's rules and global rules as immutable React 19 resources. RNW's locale providers retain their structure while the adapter reads the wrapped host's classes. React hoists the resources into the head and activates them before revealing a Suspense boundary. The stream does not wait for all components to load. The browser also declares resources, so new client rules retain the same specificity and precedence as server rules. RNW continues its normal CSS insertion. Native resolution is unchanged.

The public `unstable_createElement` factory and direct imports by third-party components keep their original element structure. This supports cloning factory results and `react-native-svg`, where inserted `<style>` elements would become SVG children and cause hydration mismatches. Automatic rule delivery covers RNW components; custom primitives using the public factory need their own SSR style delivery.

`Link asChild`, `Children.only`, cloning a component child, forwarded refs, focus, event handlers and Pressable render props are covered by browser regressions. Forward received props and refs to the intended host element. Expo's Slot requires a flattened style object on its direct child in development; use `StyleSheet.flatten` for that prop.

Each rule has a content-based identity, and React deduplicates rules per document. All six RNW precedence groups are established in order, including groups that are initially empty, so a late shorthand still precedes earlier longhands. Generated selectors repeat their class to outrank Expo's incomplete legacy RNW stylesheet regardless of head placement. Inline styles still override these rules. Each element declares its dependencies independently. This supports aborted renders and separate requests. Resource siblings occupy a separate fragment so changing dependencies preserves child component state.

Adding styles during rendering delivers each required rule once per document. Existing browser stylesheets are read once when an ordered sheet is created; rendering uses the class index. Parsed rules and React resource elements are cached. Per-element resource work depends on the element's classes and global rules. Use module-level styles for bounded definitions and inline styles for arbitrary dynamic values. React may retain resources after navigation.

## Layout stability

Styles must have the same definitions on server and client. Correct CSS delivery prevents shifts caused by missing styles; it cannot prevent shifts caused by changing content or an application's hydration differences.

The [Expo demo](../../examples/expo/README.md) verifies first visible frame styles, delayed hydration, zero measured layout shift, streaming fallback/reveal, interactivity, and lazy navigation in development and production.
