import type {ExpoConfig} from 'expo/config';

const mode = process.env.DEMO_OUTPUT ?? 'server';
if (mode !== 'server' && mode !== 'single' && mode !== 'static') {
  throw new Error(`Invalid DEMO_OUTPUT: ${mode}`);
}

const config: ExpoConfig = {
  name: 'Media styles',
  slug: 'media-styles-demo',
  scheme: 'media-styles-demo',
  web: {bundler: 'metro', output: mode},
  plugins: [
    [
      'expo-router',
      {
        // Development route bundling can replace SSR content with Expo's root
        // "Bundling..." fallback during hydration. Keep route splitting for
        // production; the component-level Suspense demo streams in both modes.
        asyncRoutes: {web: 'production'},
        unstable_useServerRendering: mode === 'server',
      },
    ],
  ],
  extra: {demoOutput: mode},
};

export default config;
