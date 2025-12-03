module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for expo-router
      'expo-router/babel',
      // Required for react-native-reanimated (MUST BE LAST)
      'react-native-reanimated/plugin',
    ],
  };
};