# Expo Router styling demo

An Expo SDK 57 app demonstrating the usage of `react-native-media-styles`.

Install and launch commands are in the [root README](../../README.md).

## Component styles

[ResponsiveCard.tsx](./components/ResponsiveCard.tsx) defines the card's padding and spacing next to the component:

```tsx
const card = breakpoints<ViewStyle>({
  base: {padding: 24, gap: 16},
  '(min-width: 800px)': {flex: 1, padding: 32},
});
const compact = breakpoints<ViewStyle>({base: {gap: 12}});

// Inside ResponsiveCard:
const {style} = useBreakpointStyles([card, number === '02' && compact]);
return <View style={[styles.card, style]}>{/* Card content */}</View>;.
```

On web, those objects become CSS media queries. On native, the hook applies the queries that match the current screen.

## Where the CSS comes from

The app turns both packages on:

- **Responsive styles.** [babel.config.cts](./babel.config.cts) enables `@react-native-media-styles/babel-plugin`. At compile time the plugin adds `BreakpointStyles` beside the component's returned element. React puts that CSS in `<head>`. The demo source does not contain a hand-written `BreakpointStyles`.
- **Other React Native styles.** [metro.config.cts](./metro.config.cts) wraps Expo's Metro config with `withStreamingStyles` from `react-native-web-streaming-styles`. On web, React Native Web turns `StyleSheet.create` into classes. The adapter emits that CSS during render, including when a component shows up later in the SSR stream.

Styles stay in the component file. There is no central list to import, and the server document does not inject CSS itself.

## In the running app

**Resize.** Change the overview width across 800px. Card padding changes, and the cards switch between a column and a row. [Screen.tsx](./components/Screen.tsx) changes the page padding at the same breakpoint.

**Client navigation.** Choose **Open details**. [app/details.tsx](./app/details.tsx) defines its own responsive styles, and they are emitted when that route renders. The overview page does not import them.

**Streaming.** [StreamCard.tsx](./components/StreamCard.tsx) has its own styles and renders inside Suspense. When the server streams the card, both integrations emit its responsive CSS and its React Native Web CSS before the card is shown. Padding is 24px below 800px and 40px above that. If the card is already loaded, it can appear right away.
