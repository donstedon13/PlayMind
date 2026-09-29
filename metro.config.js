const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Workaround για Firebase JS SDK + Metro "package exports" (Expo SDK 53+).
// Χωρίς αυτό εμφανίζεται συχνά: "Component auth has not been registered yet".
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
