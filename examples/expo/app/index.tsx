import {lazy, Suspense, useState} from 'react';
import {Link} from 'expo-router';
import {
  Pressable,
  Platform,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import {breakpoints, useBreakpointStyle} from '@react-native-media-styles/core';
import {ResponsiveCard} from '../components/ResponsiveCard';
import {Screen} from '../components/Screen';

// Delay module evaluation on the server so the shell streams before this
// component registers its styles. Load it synchronously on the client: Expo's
// hydration updates must not re-suspend and replace the revealed server card.
// The separate details route still demonstrates client route code splitting.
const StreamCard =
  Platform.OS === 'web' && typeof window === 'undefined'
    ? lazy(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        return import('../components/StreamCard');
      })
    : require('../components/StreamCard').default;
const heading = breakpoints<TextStyle>({
  base: {fontSize: 42, lineHeight: 46},
  '(min-width: 800px)': {fontSize: 72, lineHeight: 76},
});
const grid = breakpoints<ViewStyle>({
  base: {flexDirection: 'column', gap: 18},
  '(min-width: 800px)': {flexDirection: 'row', alignItems: 'stretch', gap: 24},
});
// Reserving the lazy component's space avoids a content-driven shift when the
// fallback is replaced. CSS delivery alone cannot predict a component's size.
const streamSlot = breakpoints<ViewStyle>({
  base: {minHeight: 400},
  '(min-width: 800px)': {minHeight: 260},
});

export default function Home() {
  const [count, setCount] = useState(0);
  const [clickedStyle, setClickedStyle] = useState<ViewStyle>();
  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={[styles.heading, useBreakpointStyle(heading)]}>
          Styles that travel{'\n'}with your components.
        </Text>
        <Text style={styles.intro}>
          Resize the window. Follow a route. Watch a component arrive. Each one
          brings its own responsive CSS.
        </Text>
        <View style={styles.actions}>
          <Link
            href="/details"
            testID="details-link"
            style={[
              styles.button,
              styles.primaryButton,
              styles.primaryButtonText,
            ]}
          >
            Open details →
          </Link>
          <Pressable
            testID="counter"
            onPress={() => {
              setCount((value) => value + 1);
              // This rule is registered only after a client interaction. Check
              // that it can override the shorthand delivered by the server.
              setClickedStyle(
                StyleSheet.create({button: {paddingLeft: 31}}).button,
              );
            }}
            style={[styles.button, styles.secondaryButton, clickedStyle]}
          >
            <Text style={styles.secondaryButtonText}>
              Test interactivity · {count}
            </Text>
          </Pressable>
        </View>
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
      <View style={useBreakpointStyle(streamSlot)}>
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  hero: {gap: 24},
  heading: {fontWeight: '800', letterSpacing: -2, color: '#172c32'},
  intro: {fontSize: 17, lineHeight: 27, maxWidth: 570, color: '#53676a'},
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 7,
    borderWidth: 1,
  },
  primaryButton: {backgroundColor: '#172c32', borderColor: '#172c32'},
  secondaryButton: {backgroundColor: 'transparent', borderColor: '#a8b8b3'},
  primaryButtonText: {color: '#fff', fontSize: 13, fontWeight: '600'},
  secondaryButtonText: {color: '#172c32', fontSize: 13, fontWeight: '600'},
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
