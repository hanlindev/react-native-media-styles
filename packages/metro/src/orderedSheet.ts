import originalCreateSheet from 'react-native-web-streaming-styles/original-ordered-sheet';
import {registry} from './registry';

export default function createOrderedSheet(sheet: unknown) {
  const ordered = originalCreateSheet(sheet);
  // A browser sheet may have been hydrated from Expo's server stylesheet.
  // Read it once when the sheet is created, never once per rendered element.
  registry.hydrate(ordered.getTextContent());
  const insert = ordered.insert;
  ordered.insert = (css, group) => {
    insert(css, group);
    registry.insert(css, group);
  };
  return ordered;
}
