declare module '@react-native-media-styles/metro/original-create-element' {
  import type {ReactElement} from 'react';
  export default function createElement(
    component: unknown,
    props: unknown,
    options?: unknown,
  ): ReactElement;
}
declare module 'react-native-web/dist/exports/StyleSheet' {
  const StyleSheet: {getSheet(): {id: string; textContent: string}};
  export default StyleSheet;
}
