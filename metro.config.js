// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Handle PDF Parser better
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];
config.resolver.assetExts = [...config.resolver.assetExts, 'pdf'];

// Use our own shim for pdf-parse instead of blocking it
config.resolver.extraNodeModules = {
  'pdf-parse': path.resolve(__dirname, './utils/pdf-parse-shim.js')
};

module.exports = config;
