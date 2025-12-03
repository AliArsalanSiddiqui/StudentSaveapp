module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // expo-router/babel is now included in babel-preset-expo
      // Required for react-native-reanimated (MUST BE LAST)
      'react-native-reanimated/plugin',
    ],
  };
};