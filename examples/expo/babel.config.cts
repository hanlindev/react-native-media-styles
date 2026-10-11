import type {ConfigAPI} from '@babel/core';

module.exports = function (api: ConfigAPI) {
  api.cache.forever();
  return {
    presets: ['babel-preset-expo'],
    plugins: ['@react-native-media-styles/babel-plugin'],
  };
};
