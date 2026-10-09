import type {
  StyleProp,
  TextProps,
  TextStyle,
  ViewProps,
  ViewStyle,
} from 'react-native';

import type {ComponentStyle} from './types';

import {breakpoints, useBreakpointStyle} from './breakpoints';

const card = breakpoints<ViewStyle>({
  base: {width: '100%', padding: 16},
  '(min-width: 600px)': {width: '47%'},
});

const title = breakpoints<TextStyle>({
  base: {fontSize: 32, lineHeight: 36.8, width: '100%'},
});

// @ts-expect-error The style type argument is required.
breakpoints({base: {width: '100%'}});

// @ts-expect-error fontSize is not a view style.
breakpoints<ViewStyle>({base: {fontSize: 16}});

const cardStyle = useBreakpointStyle(card);
const titleStyle = useBreakpointStyle(title);
const _viewStyle: ViewProps['style'] = cardStyle;
const _textStyle: TextProps['style'] = titleStyle;

type Expect<T extends true> = T;
type Assignable<A, B> = [A] extends [B] ? true : false;

type _hook = Expect<
  Assignable<
    ReturnType<typeof useBreakpointStyle<ViewStyle>>,
    StyleProp<ComponentStyle<ViewStyle>>
  >
>;
