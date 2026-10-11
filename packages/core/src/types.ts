import type {ImageStyle, StyleProp, TextStyle, ViewStyle} from 'react-native';

export type MediaStyle = ViewStyle | TextStyle | ImageStyle;

/**
 * Restrict RN styles to properties handled by our scalar CSS serializer and
 * native normalization. Full RN types also allow structured values such as
 * transform arrays, which require property-specific CSS conversion.
 */
type SupportedStyleProperty =
  | 'margin'
  | 'marginHorizontal'
  | 'marginVertical'
  | 'marginTop'
  | 'marginRight'
  | 'marginBottom'
  | 'marginLeft'
  | 'padding'
  | 'paddingHorizontal'
  | 'paddingVertical'
  | 'paddingTop'
  | 'paddingRight'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'gap'
  | 'rowGap'
  | 'columnGap'
  | 'inset'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'display'
  | 'width'
  | 'height'
  | 'minWidth'
  | 'maxWidth'
  | 'minHeight'
  | 'maxHeight'
  | 'flex'
  | 'flexBasis'
  | 'flexGrow'
  | 'flexShrink'
  | 'flexDirection'
  | 'flexWrap'
  | 'alignItems'
  | 'alignSelf'
  | 'alignContent'
  | 'justifyContent'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'fontWeight'
  | 'position'
  | 'aspectRatio'
  | 'opacity'
  | 'zIndex';

export type BreakpointStyle<T> = T extends unknown
  ? {
      [K in keyof T as K extends SupportedStyleProperty ? K : never]: Extract<
        T[K],
        string | number | null | undefined
      >;
    } & {
      [K in Exclude<keyof T, SupportedStyleProperty>]?: never;
    }
  : never;

export type BreakpointMap<T> = {
  [query: `(${string})`]: BreakpointStyle<T> | undefined;
  base?: BreakpointStyle<T>;
};

export type BreakpointEntry<T> = {
  readonly query: string | null;
  readonly style: T;
};

export type BreakpointToken<T> = {
  readonly entries: readonly BreakpointEntry<T>[];
  readonly style: StyleProp<ComponentStyle<T>>;
};

export type BreakpointStylesProps = {
  readonly tokens: readonly BreakpointToken<unknown>[];
};

export type BreakpointStyleInput<T> =
  | BreakpointToken<T>
  | null
  | undefined
  | boolean;

export type ComposedBreakpointStyle<T> = {
  readonly token: BreakpointToken<T>;
  readonly style: StyleProp<ComponentStyle<T>>;
};

export type ComponentStyle<T> = Omit<
  T,
  'boxSizing' | 'cursor' | 'position' | 'userSelect'
>;

export type MediaEnvironment = {
  width: number;
  height: number;
  colorScheme: 'light' | 'dark' | null | undefined;
};
