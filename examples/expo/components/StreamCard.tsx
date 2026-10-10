import {StyleSheet, Text, View, type ViewStyle} from 'react-native';
import {
  BreakpointStyles,
  breakpoints,
  useBreakpointStyle,
} from '@react-native-media-styles/core';

const panel = breakpoints<ViewStyle>({
  base: {padding: 24, gap: 12},
  '(min-width: 800px)': {padding: 40},
});

export default function StreamCard() {
  return (
    <>
      <BreakpointStyles tokens={[panel]} />
      <View
        testID="streamed-card"
        style={[styles.panel, useBreakpointStyle(panel)]}
      >
        <Text style={styles.label}>03 / ARRIVED WITH ITS OWN CSS</Text>
        <Text style={styles.title}>The shell did not have to wait.</Text>
        <Text style={styles.body}>
          This lazy component declares its stylesheet inside the Suspense
          boundary. On the first SSR load, React streams its styles with the
          content. Padding changes from 24px to 40px at 800px.
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  panel: {backgroundColor: '#dce9df', borderRadius: 12},
  label: {fontSize: 10, letterSpacing: 1.6, color: '#37684e'},
  title: {fontSize: 27, fontWeight: '700', color: '#173c2e'},
  body: {fontSize: 15, lineHeight: 24, color: '#3a6250', maxWidth: 680},
});
