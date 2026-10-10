import {lazy, Suspense, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import {
  BreakpointStyles,
  breakpoints,
  useBreakpointStyle,
} from '@react-native-media-styles/core';
import {ResponsiveCard} from '../components/ResponsiveCard';

// This module and its tokens are genuinely lazy. Delay the first load so the
// shell/fallback are observable before React streams the component and its CSS.
const StreamCard = lazy(async () => {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return import('../components/StreamCard');
});
const heading = breakpoints<TextStyle>({
  base: {fontSize: 42, lineHeight: 46},
  '(min-width: 800px)': {fontSize: 72, lineHeight: 76},
});
const grid = breakpoints<ViewStyle>({
  base: {flexDirection: 'column', gap: 18},
  '(min-width: 800px)': {flexDirection: 'row', alignItems: 'stretch', gap: 24},
});

export default function Home() {
  const [count, setCount] = useState(0);
  return (
    <>
      <BreakpointStyles tokens={[heading, grid]} />
      <View style={styles.hero}>
        <Text style={[styles.heading, useBreakpointStyle(heading)]}>
          Styles that travel{'\n'}with your components.
        </Text>
        <Text style={styles.intro}>
          Resize the window. Follow a route. Watch a component arrive. Each one
          brings its own responsive CSS.
        </Text>
        <Pressable
          testID="counter"
          onPress={() => setCount((value) => value + 1)}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Test interactivity · {count}</Text>
        </Pressable>
      </View>
      <View testID="responsive-grid" style={useBreakpointStyle(grid)}>
        <ResponsiveCard
          number="01"
          title="A layout that adapts"
          description="Below 800px these cards stack. Above it, they sit side by side. The browser evaluates the media query."
        />
        <ResponsiveCard
          number="02"
          title="Styles stay nearby"
          description="The token, companion, and consuming element live in the same component. There is no app-wide style list."
        />
      </View>
      <Suspense
        fallback={
          <View testID="stream-fallback" style={styles.fallback}>
            <Text style={styles.fallbackText}>
              Loading the streamed component…
            </Text>
          </View>
        }
      >
        <StreamCard />
      </Suspense>
    </>
  );
}

const styles = StyleSheet.create({
  hero: {gap: 24},
  heading: {fontWeight: '800', letterSpacing: -2, color: '#172c32'},
  intro: {fontSize: 17, lineHeight: 27, maxWidth: 570, color: '#53676a'},
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#172c32',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 7,
  },
  buttonText: {color: '#fff', fontSize: 13, fontWeight: '600'},
  fallback: {
    minHeight: 170,
    padding: 28,
    borderWidth: 1,
    borderColor: '#c7d3ce',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
  },
  fallbackText: {color: '#607176', fontSize: 15},
});
