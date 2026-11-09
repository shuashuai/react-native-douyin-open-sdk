require 'json'
package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
Pod::Spec.new do |s|
  s.name = 'react-native-douyin-open-sdk'
  s.version = package['version']
  s.summary = package['description']
  s.homepage = package['homepage']
  s.license = { :type => 'MIT', :file => 'LICENSE' }
  s.authors = 'shuashuai'
  s.source = { :git => 'https://github.com/shuashuai/react-native-douyin-open-sdk.git', :tag => "v#{s.version}" }
  s.platforms = { :ios => '15.1' }
  s.source_files = 'ios/**/*.{h,m,mm}'
  s.dependency 'DouyinOpenSDK', '4.2.5'
  s.frameworks = 'Photos', 'UIKit'
  if defined?(install_modules_dependencies)
    install_modules_dependencies(s)
  else
    s.dependency 'React-Core'
  end
end
