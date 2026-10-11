import type {ReactNode} from 'react';
import {ScrollView, StyleSheet, View, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {breakpoints, useBreakpointStyle} from '@react-native-media-styles/core';

const spacing = breakpoints<ViewStyle>({
  base: {paddingHorizontal: 20, paddingVertical: 28, gap: 36},
  '(min-width: 800px)': {paddingHorizontal: 56, paddingVertical: 40, gap: 56},
});

export function Screen({children}: {children: ReactNode}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      testID="page-shell"
      style={styles.viewport}
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View
        testID="page-frame"
        style={[styles.frame, useBreakpointStyle(spacing)]}
      >
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  viewport: {flex: 1, backgroundColor: '#f4f2ed'},
  content: {flexGrow: 1},
  frame: {width: '100%', maxWidth: 1240, alignSelf: 'center'},
});
