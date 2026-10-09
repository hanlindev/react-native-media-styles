import type {ImageStyle, StyleProp, TextStyle, ViewStyle} from 'react-native';

export type MediaStyle = ViewStyle | TextStyle | ImageStyle;

export type BreakpointMap<T> = {
  [query: string]: T | undefined;
  base?: T;
};

export type BreakpointEntry<T> = {
  readonly query: string | null;
  readonly style: T;
};

export type BreakpointToken<T> = {
  readonly entries: readonly BreakpointEntry<T>[];
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
