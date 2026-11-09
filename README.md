# react-native-douyin-open-sdk

独立 React Native 抖音分享桥接库，0.1.0。统一 API，原生差异在库内适配。尚未发布 npm；源码仓库：https://github.com/shuashuai/react-native-douyin-open-sdk。只实现 SDK，没有接入或修改 promoter-app。

实现版本：Android Open SDK **0.2.0.10**；iOS **4.2.5**。Android 官方文档的 0.2.0.11 存在无法解析的 polaris 传递依赖，本库没有排除该安全组件来强行构建，改用上一正式版本；详情见 [验证记录](docs/VALIDATION.md)。

当前为待真机联调版本。TS/逻辑测试、Android 库构建、iOS 桥接编译分别记录，不把静态检查等同于分享成功。新架构采用 RN 原生模块互操作，不是独立 TurboModule codegen 实现。

## 安装

在本目录：

```sh
npm install
npm run typecheck
npm test
npm pack
```

在独立测试宿主中安装生成的 tgz，执行 `pod install`，重新编译安装两端 App。SDK 包含编译后的 lib，可直接使用 tgz，无 prepare 安装脚本。

目标 RN 0.83.3；JS peer 范围 >=0.73 不是已测试兼容承诺。Android minSdk 24、Java 17；iOS deployment target 15.1。使用宿主提供的 AGP/Gradle 版本，并保证与其 RN 版本兼容。

### Android 配置

库 Manifest 合并了主版抖音包可见性、回调 Activity 和限定缓存目录的独立 FileProvider，无需宿主创建同名 Activity。SDK 使用 `callerLocalEntry` 指向库内回调 Activity。

如果宿主在 settings.gradle 集中管理仓库或禁止模块声明仓库，需在宿主仓库配置中加入：

```gradle
maven { url 'https://artifact.bytedance.com/repository/AwemeOpenSDK' }
```

依赖固定版本的 opensdk-china-external、opensdk-common、openokhttp-china-external、openpicasso-china-external。本库注入官方默认网络/图片服务；宿主信息仅提供应用版本/名称，设备标识为空，不额外采集设备 ID。初始化自动 tracker 关闭；请在用户同意 SDK 隐私条款后调用 configure，关闭 tracker 不等于官方 SDK 不产生任何网络请求。

开放平台登记宿主的真实 applicationId 和签名 MD5，测试包也须匹配。库不保存 keystore、签名密码或 clientSecret。请检查宿主构建后的 Manifest/合并混淆规则；R8 保留规则由 consumer-rules.pro 提供。

### iOS 配置

依赖由 podspec 引入 `DouyinOpenSDK = 4.2.5`。该官方 Pod 排除了模拟器 arm64；Apple Silicon 上优先真机验证，不能承诺原生 arm64 模拟器运行。

Info.plist 合并下列配置，不覆盖已有条目：

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>douyinopensdk</string>
  <string>douyinsharesdk</string>
  <string>snssdk1128</string>
</array>
<key>CFBundleURLTypes</key>
<array><dict><key>CFBundleURLSchemes</key><array><string>YOUR_CLIENT_KEY</string></array></dict></array>
<key>NSPhotoLibraryUsageDescription</key><string>读取您选择的图片或视频用于分享</string>
<key>NSPhotoLibraryAddUsageDescription</key><string>将您选择的素材保存到相册供抖音分享</string>
```

在宿主 AppDelegate 中合并生命周期路由。示意 Objective-C；Swift/RN 自定义 AppDelegate 应做同等转发，不能替换宿主已有 RN/其他 SDK 的逻辑：

```objc
#import <react-native-douyin-open-sdk/RNDouyinOpenSDK.h>
// 如果宿主未生成该头文件模块路径，可使用 #import "RNDouyinOpenSDK.h"。

// 在已有 didFinishLaunchingWithOptions 中，用户同意官方 SDK 隐私条款后调用：
[RNDouyinOpenSDK application:application didFinishLaunchingWithOptions:launchOptions];
// 保留原 didFinishLaunchingWithOptions 的其他初始化和返回结果。

// 在已有 application:openURL:options: 中：
if ([RNDouyinOpenSDK application:application openURL:url options:options]) return YES;
// 未处理的 URL 继续交给 RCTLinkingManager / 宿主原有路由。
```

使用 UIScene 的宿主也需将 scene:openURLContexts: 转发到同一 helper（传入对应 sourceApplication/annotation）。库不会替宿主自动 swizzle。冷启动路由须由宿主转发，但进程重建后的旧 JS Promise 不恢复。

权限由宿主显式申请，本库不弹授权窗口。媒体准备/分享要求 Photos readWrite 为 authorized 或 limited；limited 时只处理宿主可访问的资产，不能保证抖音侧也有相册权限。

## API

```ts
import Douyin from 'react-native-douyin-open-sdk'
await Douyin.configure({ clientKey: 'YOUR_CLIENT_KEY' })
const installed = await Douyin.isAppInstalled()
const capabilities = await Douyin.getCapabilities()
```

| 方法 | 返回 | 说明 |
| --- | --- | --- |
| configure({ clientKey }) | Promise<void> | 注册 SDK；有分享等待时不能重配 |
| isAppInstalled() | Promise<boolean> | 检查抖音主版，不代表分享权限 |
| getCapabilities() | Promise<Capabilities> | supported / unsupported / unknown，不代表账号 scope 已获批 |
| prepareResources(resources, options) | Promise<Resource[]> | 显式本地资源准备，不下载网络素材 |
| share(request, options?) | Promise<ShareResult> | 图片/视频到作品流程 |
| shareToContacts(request, options?) | Promise<ShareResult> | 单图或链接到好友/群 |
| cancelPendingShare() | Promise<void> | 停止本地等待，不取消抖音中的操作 |

Capabilities 字段：share、shareToContacts、shareToPublish、mixShare。Android 使用对应官方能力检测；iOS 未找到可靠对等查询，安装主版后前三项返回 unknown，未安装则 unsupported。不据版本字符串猜测支持。混合素材不在首期范围，两端 mixShare 均为 unsupported。

### 素材准备

```ts
const resources = await Douyin.prepareResources(
  [{ type: 'file', uri: 'file:///local/image.png' }],
  { mediaType: 'image', allowPhotoLibraryWrite: true },
)
await Douyin.share({ mediaType: 'image', resources, targetPage: 'edit', title: '作品文案' })
```

资源联合：

- `{ type: 'file', uri }`：file:/// 本地文件；Android 也接受宿主可读取的 content://。不接受 HTTP 图片/视频 URL。
- `{ type: 'photoAsset', localIdentifier }`：仅 iOS，已有相册标识。

prepare options：mediaType 必填 image/video；allowPhotoLibraryWrite 默认 false，只在 iOS 本地文件导入时生效。iOS 必须先获得 Photos 权限并明确传 true；素材会持久保留在相册，库不自动删除，重复准备可能生成重复资产。已有相册资源会校验类型和可访问性。失败后如已产生资产，不会自动删除用户相册内容。

Android prepare 验证读取权限，返回原资源；真正 share 时后台复制到库自己的缓存目录并临时授权给抖音。最多 12 项，每个缓存文件上限 512 MiB（本库保护限制）。文件需有可识别扩展名或 ContentResolver MIME；不会转码。

Android 正常响应后清理临时资源；本地取消/超时后保留授权和缓存最多约 24 小时，避免立即中断抖音读取。进程被杀时下次 configure 清理过期缓存；本库不保证远端操作最终成功。

### 作品参数

| 参数 | 类型 / 默认 | 说明 |
| --- | --- | --- |
| mediaType | image / video，必填 | 不支持纯文字或混合类型 |
| resources | Resource[]，必填 | 1–12，使用保守跨端上限；原生仍可能因尺寸/时长拒绝 |
| targetPage | edit / publish，默认 edit | publish 只接受一个视频，受抖音版本/权限限制 |
| imageAlbumMode | boolean，默认 false | 仅图片；Android ImageAlbumObject / iOS imageAlbumMode |
| title | string，可选 | 文案：Android ShareParam.titleObject.title，iOS ShareTitle.text，非独立纯文字发布 |
| state | string，可选 | 原样传给官方 SDK，不用于库内部请求关联 |

不自行截断标题或偷偷降级目标页面，原生不支持或资源限制导致的失败向调用者返回。真实图集、标题效果待已配置账号真机验证。

### 好友参数

```ts
await Douyin.shareToContacts({
  mediaType: 'link',
  link: {
    url: 'https://example.com/share/123',
    title: '标题',
    description: '描述',
    thumbnailUrl: 'https://example.com/cover.jpg',
  },
})
// 单图：先准备资源，再传 { mediaType: 'image', resources, state? }
```

link.url/title/description 必填，thumbnailUrl 可选；URL 与封面使用无内嵌账号密码的完整 HTTPS 地址。link 和 resources 互斥。好友图片只允许一张。不接受通用文件、HTML 源码、纯文本、多图或视频。

好友链接需 im.share 权限和链接验证；同域名动态路径是否全覆盖由后台实际规则决定，库无法离线确认。远程封面和网页按链接协议交给官方 SDK，不属于本库媒体下载能力。

### 回调和错误

ShareResult：

```ts
{ status: 'success' | 'cancelled' | 'failed' | 'unknown',
  platform: 'android' | 'ios', nativeResponse: { /* 原生诊断字段 */ } }
```

resolve 只说明 SDK 回调已返回；success 不保证作品已发布、消息已送达或内容审核通过。Android 原生 errorCode/errorMsg、作品 state/subErrorCode 保留；iOS isSucceed/errCode/errString/shareState/subErrorCode/state 保留。账号权限等官方失败和用户取消 resolve 结果，本地故障 reject。

本地错误包括 E_NOT_LINKED、E_NOT_CONFIGURED、E_INVALID_ARGUMENT、E_BUSY、E_NOT_INSTALLED、E_UNSUPPORTED、E_PERMISSION、E_RESOURCE、E_RESOURCE_FORMAT、E_RESOURCE_TOO_LARGE、E_PHOTO_WRITE_REQUIRED、E_SEND_FAILED、E_TIMEOUT、E_CANCELLED、E_CONFIGURE、E_NO_ACTIVITY、E_INVALIDATED、E_NATIVE。保留 message，勿把两端官方错误码混用。

share 第二参数 `{ timeoutMs }` 默认 120000，允许整数 1000–600000；这是库的等待策略，不是实测的抖音发布时限。超时终止等待并 reject E_TIMEOUT。仅一个请求可处于等待；不自动重试，回前台不判成功。

Android 用官方 callbackExtras 携带独立随机关联值，回调必须匹配类型和关联值；不接受无法关联的回调，旧抖音若不返回该值会超时，需要真机检查。iOS completion 按内部请求 ID 去重，迟到回调不影响新请求。state 不被库改写。

## 开发与验证

- [产品范围](docs/PRD.md)
- [平台差异](docs/PLATFORM-DIFFERENCES.md)
- [验证记录/待联调](docs/VALIDATION.md)
- [独立示例屏幕](example/ShareExample.tsx)

仓库包含集成示例屏幕，而非已经配置签名和 clientKey 的完整 App。开发依赖安装完成后用 npm test；没有改动任何宿主工程。podspec 指向 GitHub 仓库的 v版本号标签；发布前需推送对应标签。npm 发布步骤见 docs/RELEASING.md。

MIT 仅覆盖本桥接库，抖音原生 SDK 按其官方许可使用，不在本仓库 vendoring 官方二进制。
