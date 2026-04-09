const { withProjectBuildGradle } = require("expo/config-plugins");

/**
 * Expo config plugin to add async-storage Maven repository.
 * async-storage v3.x requires this repo for org.asyncstorage.shared_storage
 */
function withAsyncStorageMaven(config) {
  return withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    
    const asyncStorageMaven = `maven { url 'https://packages.async-storage.dev/maven' }`;
    
    if (!contents.includes('packages.async-storage.dev')) {
      // Add after jitpack or after mavenCentral in the first allprojects block
      config.modResults.contents = contents.replace(
        /maven\s*\{\s*url\s*'https:\/\/www\.jitpack\.io'\s*\}/,
        `maven { url 'https://www.jitpack.io' }\n    ${asyncStorageMaven}`
      );
    }
    
    return config;
  });
}

module.exports = withAsyncStorageMaven;
