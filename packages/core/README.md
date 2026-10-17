# @react-native-media-styles/core

`breakpoints()` takes a map of media queries to React Native style objects and returns one style value. On the web, each declaration becomes its own class and each query is emitted inside `@media`. On native, `useBreakpointStyle` merges the queries that match the window and the color scheme.

## Install

The app needs `react` and `react-native` installed already.

```sh
npm install @react-native-media-styles/core
```

## Usage

The type argument is required. Use `ViewStyle`, `TextStyle`, or `ImageStyle`, the style types React Native already defines for those components.

```tsx
import {Text, View, type TextStyle, type ViewStyle} from 'react-native';
import {
  BreakpointStyles,
  breakpoints,
  useBreakpointStyle,
} from '@react-native-media-styles/core';

const card = breakpoints<ViewStyle>({
  base: {width: '100%'},
  '(min-width: 600px) and (max-width: 999px)': {width: '47%'},
  '(min-width: 1000px)': {width: '31%'},
  '(orientation: landscape) and (max-width: 900px)': {width: '47%'},
});

const title = breakpoints<TextStyle>({
  base: {fontSize: 32, lineHeight: 36.8},
  '(min-width: 600px)': {fontSize: 40, lineHeight: 44},
});

export function Example() {
  return (
    <>
      <BreakpointStyles tokens={[card, title]} />
      <View style={useBreakpointStyle(card)}>
        <Text style={useBreakpointStyle(title)}>Title</Text>
      </View>
    </>
  );
}
```

`base` always applies first, wherever it sits in the map. Later matching queries override earlier ones. A more complicated query is not more specific, and other tokens can be created in any order.

Inside one entry, a spacing edge beats an axis, and an axis beats the shorthand. Property order in the object does not matter. `{paddingLeft: 8, paddingHorizontal: 16, padding: 20}` comes out as left 8, right 16, and top/bottom 20. A later matching `{padding: 24}` replaces all four edges. Both platforms consume the same copied, frozen, normalized token.

`breakpoints()` throws if a query is invalid. These features are valid on their own, and combined with `and`:

- `min-width`, `max-width`, and `width`, written as `px` lengths (`0` is allowed)
- `orientation`, `portrait` or `landscape`
- `prefers-color-scheme`, `light` or `dark`

Call `breakpoints()` at module scope, while the module loads. Creating a token copies, normalizes, and freezes the declarations. It does not write CSS into the DOM. `useBreakpointStyle` returns that token's style value.

If the element has other styles too, pass the hook result through a style array:

```tsx
<View style={[useBreakpointStyle(card), {margin: 8}]} />
```

To combine several tokens on one element, pass them in order to `useBreakpointStyles`:

```tsx
const {token, style} = useBreakpointStyles([
  card,
  dense && compactCard,
  optionalCard,
]);

return (
  <>
    <BreakpointStyles tokens={[token]} />
    <View style={style} />
  </>
);
```

Import `useBreakpointStyles` from this package. Each array entry can be a token, `null`, `undefined`, or a boolean. Both `true` and `false` are ignored. Mutable and readonly arrays are fine. Entries that share a query string are merged, `base` included. Inside a query, a later entry wins per normalized property, and null or undefined declarations are skipped. The merged base applies first, then matching queries in the order each query string first appeared. Queries that mean the same thing but are spelled differently stay separate, and a more complicated query is not more specific. With no active tokens, including `useBreakpointStyles([])`, the result is empty. Pass the returned `token` to the companion. A Babel plugin is not required for this.

One element should have one responsive style value. Putting several `useBreakpointStyle` results in a single style array does not give them an order on web. Generated selectors repeat their class three times, and every query has the same specificity. They outrank React Native Web's single-class selectors and Metro's doubled selectors, in either stylesheet order. An inline style can still override a generated class.

## Supported styles

Pass plain style objects. In TypeScript, pass a style object type argument to type-check the style object fields. The input type only lists what the serializer can emit: dimensions, physical margin and padding (shorthands and edges), gap, flex and alignment, font size, line height, font weight, position and insets, aspect ratio, opacity, and z-index. Colors, borders, transforms, and the rest are not supported by this library yet.

TypeScript is the only check. Nothing validates properties at runtime, so JavaScript callers have to stick to supported declarations. Null and undefined declarations are ignored. For a reusable declaration, use `BreakpointStyle`:

```tsx
const spacing: BreakpointStyle<ViewStyle> = {padding: 16, gap: 8};
const card = breakpoints<ViewStyle>({base: spacing});
// Unsupported properties such as transform cause a TypeScript error.
```

`flex` is expanded to longhands on both platforms, using Yoga's native defaults (`useWebDefaults: false`):

- A positive number becomes `flexGrow` of that value, `flexShrink: 0`, and `flexBasis: 0`.
- `0` becomes grow 0, shrink 0, and basis `'auto'`.
- A negative number becomes grow 0, shrink of the absolute value, and basis `'auto'`. `flex: -1` shrinks by 1.

Web writes those same longhands, not the browser's numeric `flex` shorthand. An explicit `flexGrow`, `flexShrink`, or `flexBasis` in the same entry overrides the shorthand, in any property order. To let a growing item shrink, write `{flex: 1, flexShrink: 1}`.

## Web stylesheet

The [Babel plugin](../babel-plugin/README.md) inserts companions for components that call the hooks directly. The Expo demo does that. Without the plugin, render `BreakpointStyles` yourself, as in the example above.

Expo Router streaming SSR needs Metro wrapped with `[react-native-web-streaming-styles](../metro/README.md)`. Core companions emit the token CSS. The Metro adapter also emits RNW rules that register after Expo has captured its initial stylesheet, so backgrounds, widths, and the rest of the component styles are there on first paint.

Render `<BreakpointStyles tokens={[card, title]} />` in the component that uses those tokens, or in an ancestor that already has them. It does not have to sit next to the styled element, and it does not search descendants for tokens. If the content is behind Suspense, keep the companion inside that boundary, or render it on an ancestor that commits before the boundary is revealed. Do not put the companion inside `Text`.

On web the companion renders immutable React 19 stylesheet resources. React moves them to `<head>` and dedupes identical tokens. In a streaming response, a delayed component's CSS travels with its content, and React applies it before that boundary is revealed. On a client navigation, a newly rendered component declares its resources the same way. On native the companion returns `null`.

There is no import list to maintain, and no stylesheet to inject into the server document. The [Expo demo](../../examples/expo/README.md) runs SSR, SPA, and static export from the same components.

Each token owns one complete, ordered CSS block. Tokens that normalize to the same declarations share a resource id. A different declaration order is a different id, so finish order across boundaries cannot reshuffle the cascade. Server and client must build tokens from the same inputs. Editing a token's content creates a new id. React may leave a stylesheet resource in the document after its component unmounts.

Two tokens created separately, with the same definitions, share one resource:

```tsx
const cardA = breakpoints<ViewStyle>({base: {padding: 16}});
const cardB = breakpoints<ViewStyle>({base: {padding: 16}});

// React inserts one CSS resource, even though these are different token objects.
<BreakpointStyles tokens={[cardA, cardB]} />;
```

Order inside a token is the cascade. Both queries below match at 1000px, so the later entry wins:

```tsx
const wideLast = breakpoints<ViewStyle>({
  '(min-width: 600px)': {padding: 24},
  '(min-width: 900px)': {padding: 32},
});
const narrowLast = breakpoints<ViewStyle>({
  '(min-width: 900px)': {padding: 32},
  '(min-width: 600px)': {padding: 24},
});

// At 1000px: wideLast gives padding 32; narrowLast gives padding 24.
// They have different CSS identities, regardless of which renders first.
```

Composition merges the definitions before any query is tested, so a later `base` does not wipe an earlier token's responsive overrides:

```tsx
const regular = breakpoints<ViewStyle>({base: {padding: 16}});
const roomy = breakpoints<ViewStyle>({
  '(min-width: 800px)': {padding: 24},
});

// Inside a component:
const forward = useBreakpointStyles([regular, roomy]); // 16 below 800px; 24 at/above.
const reverse = useBreakpointStyles([roomy, regular]); // Also 16 below; 24 at/above.
// Declare forward.token or reverse.token in the companion for its consumer.
```

When two tokens define the same query, properties merge and the later value wins:

```tsx
const first = breakpoints<ViewStyle>({
  base: {padding: 16, opacity: 0.5},
  '(min-width: 800px)': {padding: 24},
});
const second = breakpoints<ViewStyle>({
  base: {paddingLeft: 8},
  '(min-width: 800px)': {opacity: 1},
});

// Inside a component:
const combined = useBreakpointStyles([first, second]);
// Combined base: paddingLeft 8; other padding edges 16; opacity 0.5.
// Combined 800px query: all padding edges 24; opacity 1.
```

Spacing is normalized before the merge. A later `paddingLeft` changes only the left edge of an earlier `padding`. A later `padding` replaces all four edges. If two different queries both match, the one that appears later in the merged list wins, even when a later token repeats an earlier query.

SSR needs the same queries on the server and the client. The browser evaluates them, so token definitions should not depend on `window.innerWidth`:

```tsx
// Shared module imported on both server and client.
const responsiveCard = breakpoints<ViewStyle>({
  base: {padding: 16},
  '(min-width: 800px)': {padding: 24},
});
```

An ancestor can emit CSS for a nested element. After this component unmounts, React may keep the sheet in `<head>`. The rules only match elements that use the generated classes, and mounting again reuses them:

```tsx
function CardSection() {
  const style = useBreakpointStyle(responsiveCard);
  return (
    <>
      <BreakpointStyles tokens={[responsiveCard]} />
      <View>
        <View style={style} />
      </View>
    </>
  );
}

// Inside a parent component:
return showCard ? <CardSection /> : null;
```

Tokens do not change after creation. Choosing a token with different declarations, or changing the active entries passed to `useBreakpointStyles`, selects a different resource. The previous sheet is not edited.

`getBreakpointSheet(tokens)` serializes an explicit list, for tests or for a caller that buffers the CSS itself:

```ts
const css = getBreakpointSheet([card, title]);
```

It dedupes the tokens you pass and returns their CSS. It does not read a global registry or walk loaded modules. On native it returns an empty string. If companions are already rendering those tokens, do not inject this string as well.

Coming from the MVP: render companions next to the styled components, and remove the global stylesheet injection. `getBreakpointSheet()` now takes the token list as an argument.

## Native queries

On native, the hook reads the window size and the appearance color scheme. It starts from `base`, then merges every matching query in source order. A rotation or a theme change runs that merge again.
