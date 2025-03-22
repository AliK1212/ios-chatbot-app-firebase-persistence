// This file is used by Expo to configure plugins
module.exports = function (config) {
  return {
    ...config,
    // Add a hook to exclude node modules that cause issues in iOS builds
    modifyIOSBuildProperties: props => {
      // Handle any custom build properties for iOS
      return props;
    },
    // For any other custom Expo plugins or configuration
    withDisabledNodeModules: config => {
      // A list of Node.js modules that should be excluded from the build
      const nodeModulesToExclude = [
        'pdf-parse'
      ];
      
      // Configuration to exclude problematic Node.js modules
      return {
        ...config,
        // You could add more configuration here if needed
        // This file can be integrated with prebuild.js
      };
    }
  };
};
