import type {
  StyleProp,
  TextProps,
  TextStyle,
  ViewProps,
  ViewStyle,
} from 'react-native';

import type {BreakpointStyle, ComponentStyle} from './types';

import {
  breakpoints,
  useBreakpointStyle,
  useBreakpointStyles,
} from './breakpoints';
import {BreakpointStyles} from './BreakpointStyles';

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

// @ts-expect-error Misspelled base is not a media query.
breakpoints<ViewStyle>({bass: {width: 16}});

// @ts-expect-error Transforms are not supported by the breakpoint serializer.
breakpoints<ViewStyle>({base: {transform: [{scale: 2}]}});
// @ts-expect-error Colors belong in ordinary React Native styles.
breakpoints<ViewStyle>({base: {backgroundColor: 'red'}});
// @ts-expect-error flex must be numeric.
breakpoints<ViewStyle>({base: {flex: '1'}});
// @ts-expect-error Property values retain React Native's enum types.
breakpoints<ViewStyle>({base: {flexDirection: 'diagonal'}});
// @ts-expect-error Unsupported properties are rejected even in separately declared objects.
breakpoints<ViewStyle>({base: {width: 16, transform: [{scale: 2}]}});
const unsupportedStyle = {width: 16, backgroundColor: 'red'};
// @ts-expect-error Named objects cannot bypass supported-property types.
breakpoints<ViewStyle>({base: unsupportedStyle});
const supportedStyle: BreakpointStyle<ViewStyle> = {padding: 8, flex: 1};
breakpoints<ViewStyle>({base: supportedStyle});

const cardStyle = useBreakpointStyle(card);
const titleStyle = useBreakpointStyle(title);
const _viewStyle: ViewProps['style'] = cardStyle;
const _textStyle: TextProps['style'] = titleStyle;

// A companion accepts mixed component tokens without losing their style types.
BreakpointStyles({tokens: [card, title]});

const optionalCard: typeof card | undefined = undefined;
const combined = useBreakpointStyles([card, false, true, null, optionalCard]);
const _combinedViewStyle: ViewProps['style'] = combined.style;
BreakpointStyles({tokens: [combined.token]});
useBreakpointStyles([]);
useBreakpointStyles<TextStyle>([title, undefined]);
const readonlyTokens: readonly [typeof card, undefined] = [card, undefined];
useBreakpointStyles(readonlyTokens);
// @ts-expect-error Array entries must be tokens or conditional placeholders.
useBreakpointStyles([card, {padding: 8}]);
// @ts-expect-error The token array is required.
useBreakpointStyles();
// @ts-expect-error Variadic tokens are no longer accepted.
useBreakpointStyles(card, card);

type Expect<T extends true> = T;
type Assignable<A, B> = [A] extends [B] ? true : false;

type _hook = Expect<
  Assignable<
    ReturnType<typeof useBreakpointStyle<ViewStyle>>,
    StyleProp<ComponentStyle<ViewStyle>>
  >
>;
