# react-native-web-streaming-styles

Metro adapter for streaming React Native Web stylesheets. Requires React 19 and React Native Web 0.21. It depends on RNW internals and is only verified against the RNW version in the dependency list. Newer RNW versions keep working unless those APIs change.

```sh
pnpm add react-native-web-streaming-styles
```

Wrap the Metro config you already have. For Expo:

```ts
// metro.config.cts
const {getDefaultConfig} = require('expo/metro-config');
const {withStreamingStyles} = require('react-native-web-streaming-styles');

module.exports = withStreamingStyles(getDefaultConfig(__dirname));
```

Restart Metro after changing the config. The wrapper leaves the existing resolver in place. If there are other Metro wrappers, apply this one last. Setup does not need a style import list, custom document injection, the Babel plugin, or component changes.

Responsive tokens still use core `BreakpointStyles`. This package emits normal RNW `StyleSheet.create` rules, which covers properties core does not serialize, such as colors, borders, and max widths.

## How it works

Expo's streaming renderer snapshots RNW's stylesheet before routes render. A route or a lazy component can register more styles after that.

The adapter records rules as RNW inserts them and indexes them by class name. After an element's DOM props are resolved, that element's rules and the global rules become immutable React 19 resources. Locale providers stay as RNW wrote them; classes are read from the host inside the provider. React hoists the resources into `<head>` and enables them before a Suspense boundary is revealed, so the stream does not wait for every component to finish. The browser registers the same resources, and a rule added on the client keeps the server rule's specificity and precedence. RNW still inserts its own CSS. Native resolution is unchanged.

`unstable_createElement`, and components that import it themselves, keep their original element tree. Cloning a factory result depends on that, and so does `react-native-svg`: a `<style>` child would land inside the SVG and break hydration. RNW components are covered. A custom primitive on the public factory has to emit its own SSR styles.

Browser tests cover `Link asChild`, `Children.only`, cloning a component child, forwarded refs, focus, event handlers, and Pressable render props. Forward received props and refs to the host element you intend to render. In development, Expo's Slot wants a flattened style object on its direct child. Pass that prop through `StyleSheet.flatten`.

Each rule is identified by its content, and React deduplicates rules per document. All six RNW precedence groups are created in order, including groups that start empty, so a shorthand that arrives late still comes before earlier longhands. Generated selectors repeat their class and outrank Expo's older incomplete RNW sheet, wherever they sit in `<head>`. Inline styles still override them. Each element declares its own dependencies. That covers aborted renders and separate requests. The resource siblings sit in their own fragment, so a dependency change does not reset child state.

Styles added during render are emitted once per document. Existing browser stylesheets are read once, when an ordered sheet is created. After that, rendering uses the class index. Parsed rules and the React resource elements are cached. The work for an element follows its classes and the global rules. Use module-level styles when the set is bounded, and inline styles for arbitrary values. React may keep resources after navigation.

## Layout stability

Server and client need the same style definitions. Supplying the CSS before paint avoids shifts from rules that were missing. Changed content, or a hydration mismatch in the app, can still move the layout.

The [Expo demo](../../examples/expo/README.md) checks first-frame styles, delayed hydration, measured layout shift, streaming fallback and reveal, interactivity, and lazy navigation, in development and production.
