import {defineConfig} from 'vitest/config';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
export default defineConfig({
  resolve: {
    alias: {
      '@react-native-media-styles/metro/original-create-element':
        require.resolve('react-native-web/dist/cjs/exports/createElement'),
      '@react-native-media-styles/metro/original-ordered-sheet':
        require.resolve('react-native-web/dist/cjs/exports/StyleSheet/dom/createOrderedCSSStyleSheet'),
    },
  },
  test: {include: ['src/**/*.test.ts']},
});
