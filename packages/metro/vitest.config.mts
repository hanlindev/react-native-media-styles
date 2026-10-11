import {defineConfig} from 'vitest/config';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
export default defineConfig({
  resolve: {
    alias: {
      'react-native-web-streaming-styles/original-create-element':
        require.resolve('react-native-web/dist/cjs/exports/createElement'),
      'react-native-web-streaming-styles/original-ordered-sheet':
        require.resolve('react-native-web/dist/cjs/exports/StyleSheet/dom/createOrderedCSSStyleSheet'),
    },
  },
  test: {include: ['src/**/*.test.ts']},
});
