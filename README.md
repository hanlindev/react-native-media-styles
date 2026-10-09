# react-native-media-styles

`breakpoints()` turns a map of media queries to React Native style objects into one style value. On the web, each declaration becomes its own class and each query is emitted inside `@media`. On native, `useBreakpointStyle` merges the queries that match the window and the color scheme.

## Install

The package expects `react` and `react-native` in the app.

```sh
npm install react-native-media-styles
```

## Usage

The type argument is required. `ViewStyle`, `TextStyle`, and `ImageStyle` are the style objects React Native defines for those components.

```tsx
import {Text, View, type TextStyle, type ViewStyle} from 'react-native';
import {breakpoints, useBreakpointStyle} from 'react-native-media-styles';

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
    <View style={useBreakpointStyle(card)}>
      <Text style={useBreakpointStyle(title)}>Title</Text>
    </View>
  );
}
```

`base` applies with no query. Later entries override earlier ones for the same property when more than one query matches.

`breakpoints()` throws when a query is invalid. These features, combined with `and`, are valid:

- `min-width`, `max-width`, and `width`, written as `px` lengths (`0` is also valid)
- `orientation`, with `portrait` or `landscape`
- `prefers-color-scheme`, with `light` or `dark`

Call `breakpoints()` while the module is loading. `useBreakpointStyle` reads the token that call recorded.

Pass the token through in a style array when a component also has other styles:

```tsx
<View style={[useBreakpointStyle(card), {margin: 8}]} />
```

## Web stylesheet

`getBreakpointSheet()` returns the CSS collected from every `breakpoints()` call in the running module graph. Place that string in the server document so the first HTML contains the rules:

```tsx
import {getBreakpointSheet} from 'react-native-media-styles';
import './styles';

export default function Root({children}) {
  return (
    <html>
      <head>
        <style
          id="media-styles"
          dangerouslySetInnerHTML={{__html: getBreakpointSheet()}}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

Import the modules that call `breakpoints()` before rendering the sheet. The browser applies the classes on the first paint and again when the window changes.

The sheet belongs after React Native Web's stylesheet. That stylesheet is inserted at the start of `head`, so a `<style>` later in `head` wins equal-specificity ties while its query matches.

Each class belongs to one query. A declaration used from `base` and the same declaration used inside a media query compile to two classes.

## Native queries

On native, the hook reads the window size and the appearance color scheme. It starts from `base`, then merges every matching query in source order. A rotation or theme change runs the merge again.
