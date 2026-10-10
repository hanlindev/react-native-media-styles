import {StyleSheet, Text, View, type ViewStyle} from 'react-native';
import {
  BreakpointStyles,
  breakpoints,
  useBreakpointStyle,
} from '@react-native-media-styles/core';

const card = breakpoints<ViewStyle>({
  base: {padding: 24, gap: 16},
  '(min-width: 800px)': {flex: 1, padding: 32},
});

export function ResponsiveCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <>
      <BreakpointStyles tokens={[card]} />
      <View
        testID={`responsive-card-${number}`}
        style={[styles.card, useBreakpointStyle(card)]}
      >
        <Text style={styles.number}>{number} / RESPONSIVE</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fffefa',
    borderWidth: 1,
    borderColor: '#dce1db',
    borderRadius: 12,
  },
  number: {fontSize: 10, letterSpacing: 1.6, color: '#477768'},
  title: {fontSize: 23, fontWeight: '700', color: '#172c32'},
  description: {fontSize: 15, lineHeight: 24, color: '#53676a'},
});
