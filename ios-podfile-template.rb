require File.join(File.dirname(`node --print "require.resolve('expo/package.json')"`), "scripts/autolinking")
require File.join(File.dirname(`node --print "require.resolve('react-native/package.json')"`), "scripts/react_native_pods")

require 'json'
podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}

# Add additional source repos for pods
source 'https://github.com/CocoaPods/Specs.git'
source 'https://cdn.cocoapods.org/'

platform :ios, podfile_properties['ios.deploymentTarget'] || '15.1'
install! 'cocoapods', :deterministic_uuids => false

# Add this line to enable modular headers for all pods
use_modular_headers!

prepare_react_native_project!

# Simplified configuration for newer React Native versions
target 'SafeHMO' do
  use_expo_modules!
  config = use_native_modules!
  
  # Flags change depending on the env values.
  flags = get_default_flags()

  use_react_native!(
    :path => config[:reactNativePath],
    # Hermes is now enabled by default. Disable by setting this flag to false.
    :hermes_enabled => flags[:hermes_enabled],
    :fabric_enabled => flags[:fabric_enabled],
    # An absolute path to your application root.
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  # Explicitly add RCT-Folly with a compatible version
  pod 'RCT-Folly', :podspec => '../node_modules/react-native/third-party-podspecs/RCT-Folly.podspec'
  
  # Explicitly add React-jsinspector
  pod 'React-jsinspector', :path => '../node_modules/react-native/ReactCommon/jsinspector'

  # Set variables for Firebase and other libraries that need static frameworks
  $RNFirebaseAsStaticFramework = true
  $RNGoogleMobileAdsAsStaticFramework = true

  post_install do |installer|
    # https://github.com/facebook/react-native/blob/main/packages/react-native/scripts/react_native_pods.rb#L197-L202
    react_native_post_install(
      installer,
      File.dirname(`node --print "require.resolve('react-native/package.json')"`),
      :mac_catalyst_enabled => false
    )
    
    # This is necessary for Xcode 14, because it signs resource bundles by default
    # when building for devices.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
      end
    end
  end
end
