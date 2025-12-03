const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for TurboModules
config.resolver.sourceExts.push('mjs');
config.resolver.unstable_enablePackageExports = true;

module.exports = config;