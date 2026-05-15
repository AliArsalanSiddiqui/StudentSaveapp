module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // DELETE the reanimated plugin line below — no longer needed
    // plugins: ['react-native-reanimated/plugin'],  ← REMOVE THIS
  };
};