import {Link, Slot} from 'expo-router';
import Constants from 'expo-constants';
import {StyleSheet, Text, View, type ViewStyle} from 'react-native';
import {
  BreakpointStyles,
  breakpoints,
  useBreakpointStyle,
} from '@react-native-media-styles/core';

const frame = breakpoints<ViewStyle>({
  base: {paddingHorizontal: 20, paddingVertical: 28, gap: 36},
  '(min-width: 800px)': {paddingHorizontal: 56, paddingVertical: 40, gap: 56},
});

export default function Layout() {
  return (
    <>
      <BreakpointStyles tokens={[frame]} />
      <View style={styles.page}>
        <View style={[styles.frame, useBreakpointStyle(frame)]}>
          <View style={styles.nav}>
            <Link href="/" style={styles.brand}>
              media / styles
            </Link>
            <View style={styles.links}>
              <Link href="/" style={styles.link}>
                Overview
              </Link>
              <Link href="/details" style={styles.link} testID="details-link">
                Lazy route →
              </Link>
            </View>
          </View>
          <View style={styles.status}>
            <View style={styles.dot} />
            <Text style={styles.mode}>
              {Constants.expoConfig?.extra?.demoOutput === 'single'
                ? 'SPA · CLIENT RENDERING'
                : Constants.expoConfig?.extra?.demoOutput === 'static'
                  ? 'STATIC EXPORT'
                  : 'SSR · STREAMING'}
            </Text>
            <Text style={styles.version}>EXPO ROUTER DEMO</Text>
          </View>
          <Slot />
          <Text style={styles.footer}>
            Colocated definitions. Browser-native media queries. One companion
            per component.
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  page: {minHeight: '100%', backgroundColor: '#f4f2ed'},
  frame: {width: '100%', maxWidth: 1240, marginHorizontal: 'auto'},
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
  },
  brand: {fontSize: 23, fontWeight: '800', color: '#172c32', letterSpacing: -1},
  links: {flexDirection: 'row', gap: 20},
  link: {color: '#294e57', fontSize: 14},
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  dot: {width: 7, height: 7, borderRadius: 4, backgroundColor: '#36725b'},
  mode: {fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: '#36725b'},
  version: {
    marginLeft: 'auto',
    fontSize: 10,
    letterSpacing: 1.6,
    color: '#607176',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#d5dcd7',
    paddingTop: 20,
    color: '#607176',
    fontSize: 12,
    lineHeight: 20,
  },
});
