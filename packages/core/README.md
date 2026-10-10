# @react-native-media-styles/core

`breakpoints()` turns a map of media queries to React Native style objects into one style value. On the web, each declaration becomes its own class and each query is emitted inside `@media`. On native, `useBreakpointStyle` merges the queries that match the window and the color scheme.

## Install

The package expects `react` and `react-native` in the app.

```sh
npm install @react-native-media-styles/core
```

## Usage

The type argument is required. `ViewStyle`, `TextStyle`, and `ImageStyle` are the style objects React Native defines for those components.

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

`base` always applies first, regardless of where it appears in the map. Later matching query entries override earlier ones. Query complexity does not increase selector specificity. This order is independent of when other tokens are registered.

Within each entry, spacing edges override axes, and axes override the shorthand, regardless of JavaScript property order. For example, `{paddingLeft: 8, paddingHorizontal: 16, padding: 20}` produces left 8, right 16, and top/bottom 20. A later matching `{padding: 24}` replaces all four edges. Both platforms consume the same copied, frozen, normalized token.

`breakpoints()` throws when a query is invalid. These features, combined with `and`, are valid:

- `min-width`, `max-width`, and `width`, written as `px` lengths (`0` is also valid)
- `orientation`, with `portrait` or `landscape`
- `prefers-color-scheme`, with `light` or `dark`

Call `breakpoints()` while the module is loading. Token creation copies, normalizes, and freezes the declarations without inserting CSS into the DOM. `useBreakpointStyle` returns the token's style value.

Pass the token through in a style array when a component also has other styles:

```tsx
<View style={[useBreakpointStyle(card), {margin: 8}]} />
```

To combine responsive tokens on one element, pass an ordered array to `useBreakpointStyles`:

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

Import `useBreakpointStyles` from this package. Each array entry can be a token, `null`, `undefined`, or a boolean; both `true` and `false` are ignored. Mutable and readonly arrays are accepted. The hook merges definitions for each identical query string, including `base`. Within a query, later array entries win conflicts for each normalized property; null/undefined declarations are ignored. The combined base applies first, followed by matching queries in their first-appearance order across the array. Equivalent queries written as different strings are not grouped, and query complexity does not increase precedence. With no active tokens (including `useBreakpointStyles([])`), the result is empty. Supply the returned combined `token` to the companion. No Babel plugin is required.

Use one responsive style value per element: putting separate `useBreakpointStyle` results in a style array does not establish their precedence on web. Generated selectors have equal specificity and deliberately outrank React Native Web's single-class selectors, including its default resets, regardless of stylesheet placement. Ordinary inline styles can override generated classes.

## Supported styles

Pass plain style objects, rather than registered style IDs or the output of `StyleSheet.create`. In TypeScript, pass a generic type argument (`ViewStyle`, `TextStyle`, or `ImageStyle`) to preserve the component's property and value types. The breakpoint input type exposes only properties supported by the serializer: dimensions, physical margin/padding shorthands and edges, gap, flex and alignment, font size/line height/weight, position/insets, aspect ratio, opacity, and z-index. Use ordinary React Native styles for other properties, such as colors, borders, and transforms.

Style properties and values are checked by TypeScript only; the library does not validate them at runtime. JavaScript callers must supply supported declarations. Null/undefined declarations are ignored. For reusable declarations, use the exported `BreakpointStyle` type:

```tsx
const spacing: BreakpointStyle<ViewStyle> = {padding: 16, gap: 8};
const card = breakpoints<ViewStyle>({base: spacing});
// Unsupported properties such as transform cause a TypeScript error.
```

`flex` is normalized to explicit longhands on both platforms using Yoga's native defaults (`useWebDefaults: false`). A positive value becomes `flexGrow: value`, `flexShrink: 0`, and `flexBasis: 0`. Zero becomes grow 0, shrink 0, and basis `'auto'`. A negative value becomes grow 0, shrink the absolute value, and basis `'auto'` (for example, `flex: -1` gives shrink 1). Web uses these same values instead of the browser's numeric CSS shorthand. Explicit `flexGrow`, `flexShrink`, or `flexBasis` declarations override the shorthand within the same entry, regardless of property order. To allow a growing item to shrink, use `{flex: 1, flexShrink: 1}`.

## Web stylesheet

Render `<BreakpointStyles tokens={[card, title]} />` in the component that consumes those tokens or in an ancestor that knows the tokens. It does not need to be adjacent to the styled element and does not discover tokens in descendants. If content is inside a Suspense boundary, keep its companion inside the same boundary, or declare the resources in an ancestor that renders before the boundary is revealed. Do not place the companion inside a `Text` component.

On web, the companion declares immutable React 19 stylesheet resources. React places them in the document head and deduplicates identical tokens. With streaming SSR, a delayed component's resources travel with its content, and React activates the styles before revealing that boundary. On client navigation, newly rendered components declare their resources normally. On native, the companion returns `null`.

There is no eager-import list, application-wide stylesheet, build-time extraction, or manual `+html.tsx` injection. Keep Expo Router's normal custom-document nodes and attributes. The [Expo demo](../../examples/expo/README.md) shows SSR, SPA, and static export using the same components.

Each token owns its complete ordered CSS block. Identical normalized tokens share a resource identity; differently ordered tokens use different identities, so registration or boundary completion order cannot change their cascade. Server and client must create tokens from the same inputs. Changing a token's content creates a new resource identity. React may retain stylesheet resources after their components unmount.

For example, independently created tokens with the same definitions reuse one stylesheet resource:

```tsx
const cardA = breakpoints<ViewStyle>({base: {padding: 16}});
const cardB = breakpoints<ViewStyle>({base: {padding: 16}});

// React inserts one CSS resource, even though these are different token objects.
<BreakpointStyles tokens={[cardA, cardB]} />;
```

Rule order is preserved inside each token. Both queries below match at a width of 1000px, so the last entry wins:

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

Composition merges definitions before evaluating queries, so a later base does not erase an earlier token's responsive overrides:

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

When tokens define the same query, their properties merge with later values winning:

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

Spacing is normalized before merging: a later `paddingLeft` changes only the left edge of an earlier `padding`. A later `padding` changes all four edges. For distinct queries that both match, the query first encountered later wins, even if an earlier query is repeated in a subsequent token.

For SSR, declare the same queries on the server and client. The browser evaluates the queries; token definitions should not depend on `window.innerWidth`:

```tsx
// Shared module imported on both server and client.
const responsiveCard = breakpoints<ViewStyle>({
  base: {padding: 16},
  '(min-width: 800px)': {padding: 24},
});
```

An ancestor can deliver the CSS for a nested element. When this component unmounts, React may keep its stylesheet in the head. That CSS only affects elements using the generated classes; remounting reuses it:

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

Tokens are immutable. Selecting a token with different declarations (or changing the active tokens in the array passed to `useBreakpointStyles`) selects a different resource identity rather than editing the old stylesheet.

`getBreakpointSheet(tokens)` remains an explicit serializer for tests or buffered/manual consumers:

```ts
const css = getBreakpointSheet([card, title]);
```

It deduplicates the supplied tokens and returns their CSS. It does not read a global registry or collect every loaded module. It returns an empty string on native. Do not inject this CSS separately when those tokens are already delivered by companions.

Migration from the MVP: add companions beside the styled components and remove global stylesheet injection. `getBreakpointSheet()` now requires an explicit token list.

## Native queries

On native, the hook reads the window size and the appearance color scheme. It starts from `base`, then merges every matching query in source order. A rotation or theme change runs the merge again.
