# Expo Router styling demo

This Expo SDK 57 app shows how to keep responsive styles beside the components that use them, including components loaded after the initial page. The same components run on web and native. The app is private and excluded from npm packages.

For installation and launch commands, see the [root README](../../README.md).

## Component styles

[ResponsiveCard.tsx](./components/ResponsiveCard.tsx) defines its responsive padding and spacing in the same file as the card:

```tsx
const card = breakpoints<ViewStyle>({
  base: {padding: 24, gap: 16},
  '(min-width: 800px)': {flex: 1, padding: 32},
});
const compact = breakpoints<ViewStyle>({base: {gap: 12}});

// Inside ResponsiveCard:
const {style} = useBreakpointStyles([card, number === '02' && compact]);
return <View style={[styles.card, style]}>{/* Card content */}</View>;
```

Both cards have 24px padding below 800px and 32px padding at wider widths. The second card uses a smaller gap. Backgrounds and borders are ordinary React Native styles defined with `StyleSheet.create` in that file.

On web, the responsive definitions become CSS media queries. On native, the hook selects the styles that match the current screen size.

## How the app delivers CSS

The app enables two integrations so both kinds of styles are available when their components appear:

- **Responsive styles:** [babel.config.cts](./babel.config.cts) enables `@react-native-media-styles/babel-plugin`. During compilation, it adds a `BreakpointStyles` component alongside the component's returned content. That generated component supplies the responsive CSS to React, which puts it in the document head. There is no manual `BreakpointStyles` JSX in the demo's source.
- **Ordinary React Native styles:** [metro.config.cts](./metro.config.cts) wraps Expo's bundler configuration with `withMediaStyles` from `@react-native-media-styles/metro`. On web, React Native Web turns `StyleSheet.create` styles into CSS classes. This integration delivers their CSS during rendering, including when a component arrives later in an SSR stream.

Styles stay in their component files. The app has no central list of styles to import and no manual CSS injection in its server document.

## What the demo shows

**Responsive layout:** Resize the overview across 800px. Card padding changes, and the cards switch between a column and a row. [Screen.tsx](./components/Screen.tsx) also changes page padding at that breakpoint.

**Client navigation:** Select **Open details**. [app/details.tsx](./app/details.tsx) defines its own responsive styles. They are delivered when the route renders, without the Overview page importing its tokens.

**Server streaming:** [StreamCard.tsx](./components/StreamCard.tsx) defines its own styles and renders inside Suspense. When the server streams the card, the integrations deliver its responsive CSS and ordinary React Native Web CSS before it becomes visible. Its padding is 24px below 800px and 40px at wider widths. The card may appear immediately when it is already loaded.
