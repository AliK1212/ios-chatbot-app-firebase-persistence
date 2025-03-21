const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * This plugin replaces the Podfile with our custom template that includes use_modular_headers!
 * which is needed for Swift pods like FirebaseAuth
 */
const withPodConfig = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      const templatePath = path.join(config.modRequest.projectRoot, 'ios-podfile-template.rb');
      
      if (!fs.existsSync(templatePath)) {
        console.log('Podfile template not found, skipping replacement');
        return config;
      }
      
      // Create Podfile.properties.json
      const podfilePropertiesPath = path.join(config.modRequest.platformProjectRoot, 'Podfile.properties.json');
      const podfileProperties = {
        'ios.deploymentTarget': '15.1', // Updated to match expo-build-properties
        'useModularHeaders': true
      };
      
      fs.writeFileSync(
        podfilePropertiesPath, 
        JSON.stringify(podfileProperties, null, 2)
      );
      console.log('Created Podfile.properties.json with useModularHeaders: true and deploymentTarget: 15.1');
      
      // Replace Podfile with our template
      let templateContent = fs.readFileSync(templatePath, 'utf8');
      
      // Remove any Flipper configuration if present
      if (templateContent.includes('flipper_configuration')) {
        console.log('Removing Flipper configuration from template...');
        templateContent = templateContent.replace(
          /\s*:flipper_configuration\s*=>\s*[^,]+,/g,
          ''
        );
      }
      
      fs.writeFileSync(podfilePath, templateContent);
      console.log('Replaced Podfile with custom template that includes use_modular_headers!');
      
      return config;
    },
  ]);
};

module.exports = withPodConfig;
