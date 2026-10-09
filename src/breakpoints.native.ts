import {useEffect, useMemo, useState} from 'react';
import {Appearance, useWindowDimensions} from 'react-native';

import {breakpointEntries, mergeBreakpointStyles} from './merge';

import type {StyleProp} from 'react-native';
import type {
  BreakpointMap,
  BreakpointToken,
  ComponentStyle,
  MediaStyle,
} from './types';

export function breakpoints<T extends MediaStyle = never>(
  styles: BreakpointMap<NoInfer<T>>,
): BreakpointToken<T> {
  return {entries: breakpointEntries(styles), style: undefined};
}

export function useBreakpointStyle<T extends MediaStyle>(
  token: BreakpointToken<T>,
): StyleProp<ComponentStyle<T>> {
  const {width, height} = useWindowDimensions();
  const [colorScheme, setColorScheme] = useState(() =>
    Appearance.getColorScheme(),
  );
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({colorScheme: next}) => {
      setColorScheme(next);
    });
    return () => subscription.remove();
  }, []);
  return useMemo(
    () => mergeBreakpointStyles(token.entries, {width, height, colorScheme}),
    [token, width, height, colorScheme],
  );
}
