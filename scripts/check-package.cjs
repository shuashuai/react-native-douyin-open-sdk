const fs = require('node:fs')
const path = require('node:path')
const pkg = require('../package.json')
const root = path.join(__dirname, '..')
for (const file of [pkg.main, pkg.types, 'lib/core.js', 'lib/types.d.ts', 'react-native.config.js', 'LICENSE', 'react-native-douyin-open-sdk.podspec']) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing publish artifact: ${file}`)
}
if (pkg.publishConfig.registry !== 'https://registry.npmjs.org/' || pkg.publishConfig.access !== 'public') throw new Error('Unexpected publishing target')
if (pkg.repository.url !== 'git+https://github.com/shuashuai/react-native-douyin-open-sdk.git') throw new Error('Repository metadata mismatch')
const podspec = fs.readFileSync(path.join(root, 'react-native-douyin-open-sdk.podspec'), 'utf8')
if (podspec.includes('example.invalid') || !podspec.includes('v#{s.version}')) throw new Error('Podspec source/tag not configured')
console.log(`Publish metadata/artifacts checked for ${pkg.name}@${pkg.version}; no package was published.`)
