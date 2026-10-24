const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration for PocketCore AI
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    assetExts: ['gguf', 'bin', 'png', 'jpg', 'svg', 'ttf'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
