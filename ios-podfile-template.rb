require File.join(File.dirname(`node --print "require.resolve('expo/package.json')"`), "scripts/autolinking")
require File.join(File.dirname(`node --print "require.resolve('react-native/package.json')"`), "scripts/react_native_pods")

require 'json'
podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}

# Add additional source repos for pods - only use trunk to avoid duplicate specs
source 'https://cdn.cocoapods.org/'

platform :ios, podfile_properties['ios.deploymentTarget'] || '15.1'
install! 'cocoapods', :deterministic_uuids => false

# Add this line to enable modular headers for all pods
use_modular_headers!

prepare_react_native_project!

# Simplified configuration for newer React Native versions
target 'SafeHMO' do
  use_expo_modules!
  
  # Use pod 'React-Core' directly instead of use_native_modules!
  pod 'React-Core', :path => '../node_modules/react-native/'
  
  # Include other React Native dependencies manually
  pod 'React-CoreModules', :path => '../node_modules/react-native/React/CoreModules'
  pod 'React-RCTActionSheet', :path => '../node_modules/react-native/Libraries/ActionSheetIOS'
  pod 'React-RCTAnimation', :path => '../node_modules/react-native/Libraries/NativeAnimation'
  pod 'React-RCTBlob', :path => '../node_modules/react-native/Libraries/Blob'
  pod 'React-RCTImage', :path => '../node_modules/react-native/Libraries/Image'
  pod 'React-RCTLinking', :path => '../node_modules/react-native/Libraries/LinkingIOS'
  pod 'React-RCTNetwork', :path => '../node_modules/react-native/Libraries/Network'
  pod 'React-RCTSettings', :path => '../node_modules/react-native/Libraries/Settings'
  pod 'React-RCTText', :path => '../node_modules/react-native/Libraries/Text'
  pod 'React-RCTVibration', :path => '../node_modules/react-native/Libraries/Vibration'
  
  # Add missing React-jsinspector dependency
  pod 'React-jsinspector', :path => '../node_modules/react-native/ReactCommon/jsinspector'
  
  # Explicitly add RCT-Folly with a compatible version
  pod 'RCT-Folly', :podspec => '../node_modules/react-native/third-party-podspecs/RCT-Folly.podspec'

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
