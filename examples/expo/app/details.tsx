import {Link} from 'expo-router';
import {
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

const title = breakpoints<TextStyle>({
  base: {fontSize: 38, lineHeight: 44},
  '(min-width: 800px)': {fontSize: 58, lineHeight: 64},
});
const detail = breakpoints<ViewStyle>({
  base: {padding: 22, gap: 22},
  '(min-width: 800px)': {padding: 46},
});

export default function Details() {
  return (
    <>
      <BreakpointStyles tokens={[title, detail]} />
      <View style={styles.intro}>
        <Text style={[styles.title, useBreakpointStyle(title)]}>
          A different route. Its own styles.
        </Text>
        <Text style={styles.body}>
          Navigate here from the overview to load this route's JavaScript on
          demand. Open this URL directly in SSR mode to receive its styles in
          the initial response.
        </Text>
      </View>
      <View
        testID="details-panel"
        style={[styles.panel, useBreakpointStyle(detail)]}
      >
        <Text style={styles.label}>ROUTE / DETAILS</Text>
        <Text style={styles.panelTitle}>No eager registration.</Text>
        <Text style={styles.body}>
          These breakpoint tokens are declared only in this file. No parent
          needs to import them. The companion renders the stylesheet resource
          next to the component that uses it.
        </Text>
        <Link href="/" style={styles.link}>
          ← Back to overview
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  intro: {gap: 24},
  title: {color: '#172c32', fontWeight: '800', letterSpacing: -1.8},
  body: {color: '#53676a', fontSize: 17, lineHeight: 27, maxWidth: 660},
  panel: {
    backgroundColor: '#fffefa',
    borderWidth: 1,
    borderColor: '#dce1db',
    borderRadius: 12,
  },
  label: {color: '#477768', fontSize: 10, letterSpacing: 1.6},
  panelTitle: {color: '#172c32', fontSize: 30, fontWeight: '700'},
  link: {color: '#37684e', fontSize: 15, marginTop: 8},
});
