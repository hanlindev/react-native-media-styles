const path: typeof import('node:path') = require('node:path');
const {
  getDefaultConfig,
}: typeof import('expo/metro-config') = require('expo/metro-config');
const {
  withMediaStyles,
}: typeof import('@react-native-media-styles/metro') = require('@react-native-media-styles/metro');

const config = getDefaultConfig(__dirname);
// The library is linked to source outside this app. Resolve its React imports
// to the demo's Expo-compatible versions, rather than the library test versions.
const singletons = ['react', 'react-dom', 'react-native', 'react-native-web'];
const resolveRequest: NonNullable<typeof config.resolver.resolveRequest> = (
  context,
  name,
  platform,
) => {
  if (singletons.some((pkg) => name === pkg || name.startsWith(pkg + '/'))) {
    return context.resolveRequest(
      {...context, originModulePath: path.join(__dirname, 'package.json')},
      name,
      platform,
    );
  }
  return context.resolveRequest(context, name, platform);
};
module.exports = withMediaStyles({
  ...config,
  resolver: {...config.resolver, resolveRequest},
});
