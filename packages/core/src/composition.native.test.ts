import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, vi} from 'vitest';
import type {ViewStyle} from 'react-native';
import type {ComposedBreakpointStyle} from './types';

const environment = vi.hoisted(() => ({width: 390, height: 900}));
vi.mock('react-native', () => ({
  useWindowDimensions: () => environment,
  Appearance: {getColorScheme: () => 'light'},
}));

import {breakpoints, useBreakpointStyles} from './breakpoints.native';

it('uses the same explicit flex shorthand longhands on native', () => {
  expect(breakpoints<ViewStyle>({base: {flex: 1}}).entries[0]?.style).toEqual({
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 0,
  });
});

it('resolves a native token array in order as the environment changes', () => {
  const first = breakpoints<ViewStyle>({base: {padding: 16, opacity: 0.5}});
  const later = breakpoints<ViewStyle>({'(min-width: 800px)': {padding: 24}});
  let result: ComposedBreakpointStyle<ViewStyle> | undefined;
  function App() {
    result = useBreakpointStyles([later, false, first, null, undefined, true]);
    return null;
  }
  renderToStaticMarkup(h(App));
  expect(result?.style).toMatchObject({paddingLeft: 16, opacity: 0.5});
  environment.width = 1000;
  renderToStaticMarkup(h(App));
  expect(result?.style).toMatchObject({paddingLeft: 24, opacity: 0.5});
});
