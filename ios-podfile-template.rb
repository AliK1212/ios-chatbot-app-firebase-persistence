require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

require 'json'
podfile_properties = JSON.parse(File.read(File.join(__dir__, 'Podfile.properties.json'))) rescue {}

# Add additional source repos for pods
source 'https://github.com/CocoaPods/Specs.git'
source 'https://cdn.cocoapods.org/'

platform :ios, podfile_properties['ios.deploymentTarget'] || '15.1'
# Import Swift module fix configuration if available
swift_module_fix_path = 'SwiftModuleFix.xcconfig'
has_swift_module_fix = File.exist?(File.join(__dir__, swift_module_fix_path))

install! 'cocoapods', :deterministic_uuids => false

# Add this line to ensure modular headers are used
use_modular_headers!

# Set Firebase as static frameworks
$RNFirebaseAsStaticFramework = true

prepare_react_native_project!

linkage = ENV['USE_FRAMEWORKS']
if linkage != nil
  Pod::UI.puts "Configuring Pod with #{linkage}ally linked Frameworks".green
  use_frameworks! :linkage => linkage.to_sym
end

target 'SafeHMO' do
  config = use_native_modules!
  
  # Explicitly add RCT-Folly with a compatible version
  pod 'RCT-Folly', :podspec => '../node_modules/react-native/third-party-podspecs/RCT-Folly.podspec'

  # Explicitly add FirebaseAuth and its dependencies
  pod 'FirebaseAuth', :modular_headers => true
  pod 'FirebaseCore', :modular_headers => true
  pod 'FirebaseAppCheckInterop', :modular_headers => true
  pod 'FirebaseCoreExtension', :modular_headers => true
  pod 'GTMSessionFetcher', :modular_headers => true
  pod 'RecaptchaInterop', :modular_headers => true

  # Flags change depending on the env values.
  flags = get_default_flags()

  use_react_native!(
    :path => config[:reactNativePath],
    # Hermes is now enabled by default. Disable by setting this flag to false.
    :hermes_enabled => flags[:hermes_enabled],
    :fabric_enabled => flags[:fabric_enabled],
    # Enables the New Architecture
    :new_arch_enabled => true,
    # An absolute path to your application root.
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  post_install do |installer|
    # Fix for Swift module interface verification
    if has_swift_module_fix
      installer.pods_project.build_configurations.each do |config|
        config.build_settings.merge!(YAML.load_file('SwiftModuleFix.xcconfig'))
      end
    end
    
    # Fix for React-jsinspector conflict
    installer.pods_project.targets.each do |target|
      if target.name == 'React-jsinspector'
        target.build_configurations.each do |config|
          config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'arm64'
        end
      end
      
      # Fix for Firebase Swift headers
      if ['FirebaseAuth', 'FirebaseCore', 'FirebaseFirestore', 'FirebaseStorage', 'FirebaseAppCheckInterop', 'FirebaseCoreExtension', 'GTMSessionFetcher', 'RecaptchaInterop'].include?(target.name)
        target.build_configurations.each do |config|
          config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'YES'
          config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-Onone'
          # Add Swift compilation mode settings
          config.build_settings['SWIFT_COMPILATION_MODE'] = 'wholemodule'
          # Ensure Swift modules are properly built
          config.build_settings['DEFINES_MODULE'] = 'YES'
          # Set Swift version explicitly
          config.build_settings['SWIFT_VERSION'] = '5.0'
        end
      end
    end
    
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false
    )
    
    # This is necessary for Xcode 14
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['EXPANDED_CODE_SIGN_IDENTITY'] = ""
        config.build_settings['CODE_SIGNING_REQUIRED'] = "NO"
        config.build_settings['CODE_SIGNING_ALLOWED'] = "NO"
      end
    end
  end
end
