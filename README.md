# @code_shuai/react-native-douyin-open-sdk

React Native 抖音分享 SDK，提供 Android / iOS 统一调用接口，支持作品图片、视频分享，以及好友或群聊单图、链接分享。

[源码仓库](https://github.com/shuashuai/react-native-douyin-open-sdk) · [示例屏幕](example/ShareExample.tsx) · [平台差异](docs/PLATFORM-DIFFERENCES.md)

## 功能

| 功能 | Android | iOS |
| --- | --- | --- |
| 图片、图集、视频分享到作品流程 | 支持 | 支持 |
| 单张图片或单个视频转发到日常 | 支持，需要 `aweme.forward` | 支持，需要 `aweme.forward` |
| 单视频直接进入发布页 | 支持，受抖音版本限制 | 支持，受抖音版本限制 |
| 单图分享给好友/群 | 支持 | 支持 |
| 网页链接卡片分享给好友/群 | 支持，需权限与链接验证 | 支持，需权限与链接验证 |
| 安装检测、能力查询 | 支持 | 安装检测支持；细项能力返回 unknown |
| 本地素材准备 | 文件读取校验及分享时 URI 授权 | 显式导入相册或使用现有相册资源 |
| 分享回调、超时、停止本地等待 | 支持 | 支持 |

不包含登录授权、网络媒体下载、海报生成、通用文件附件、纯文字发布或混合素材分享。HTML / PDF / Word 等内容可由业务生成在线页面，再作为链接卡片分享。

当前为首版，完整宿主与真机分享联调尚未完成，见 [验证记录](docs/VALIDATION.md)。回调 success 表示 SDK 响应成功，不保证作品最终发布或消息送达。

## 下载安装

### npm / Yarn

包发布后安装：

```bash
npm install @code_shuai/react-native-douyin-open-sdk
# 或
yarn add @code_shuai/react-native-douyin-open-sdk
```

如果版本仅发布到 next 标签，在包名后加 `@next`。是否已经发布及可用版本以 npm 仓库为准。

### 本地安装包

尚未发布时，可在 SDK 源码目录生成安装包：

```bash
npm install
npm run build
npm pack
```

在使用 SDK 的 App 中安装生成的 `.tgz`：

```bash
npm install /absolute/path/to/code_shuai-react-native-douyin-open-sdk-0.0.1.tgz
```

文件名以 npm pack 的实际输出为准。iOS 安装后执行：

```bash
cd ios
pod install
```

完成下方平台配置后，重新编译安装 App；仅刷新 JavaScript 无法加载原生模块。

### 环境要求

| 环境 | 要求 |
| --- | --- |
| React Native | 目标版本 0.83.3；peer 范围 >=0.73 不代表均已测试 |
| React | >=18 |
| Node.js（SDK 开发） | >=20 |
| Android | minSdk 24、Java 17；AGP / Gradle 与宿主 RN 版本匹配 |
| iOS | >=15.1 |
| 抖音原生 SDK | Android 0.2.0.10；iOS 4.2.5 |

RN 新架构使用原生模块互操作，非独立 TurboModule codegen。Android 原生版本选择及 iOS 模拟器限制见 [验证记录](docs/VALIDATION.md)。

## 平台配置

接入前在抖音开放平台创建移动应用，获得 clientKey，配置 Android 包名/签名和 iOS Bundle ID，并申请所需分享权限。SDK 不需要 clientSecret。

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

## 快速开始

### 1. 初始化

```ts
import Douyin from '@code_shuai/react-native-douyin-open-sdk'

// 在完成原生配置、获得用户对 SDK 隐私条款的同意后调用。
await Douyin.configure({ clientKey: 'YOUR_CLIENT_KEY' })

if (!(await Douyin.isAppInstalled())) {
  // 由业务自行提示用户安装抖音。
  return
}
```

### 2. 分享图片和文案到作品

```ts
// iOS：先由宿主申请 Photos readWrite 权限。
// allowPhotoLibraryWrite=true 会将文件保存到相册，必须由用户明确触发。
const resources = await Douyin.prepareResources(
  [{ type: 'file', uri: 'file:///local/image.jpg' }],
  { mediaType: 'image', allowPhotoLibraryWrite: true },
)

const result = await Douyin.share({
  mediaType: 'image',
  resources,
  title: '作品文案',
  imageAlbumMode: true,
  targetPage: 'edit',
})
```

### 3. 分享视频

```ts
const resources = await Douyin.prepareResources(
  [{ type: 'file', uri: 'file:///local/video.mp4' }],
  { mediaType: 'video', allowPhotoLibraryWrite: true },
)

await Douyin.share({ mediaType: 'video', resources, targetPage: 'publish' })
```

`publish` 只接受单视频；需要进入编辑流程时使用 `edit`。最终能否使用仍由抖音版本、权限和资源条件决定。

### 4. 分享给好友或群

```ts
// 单图：resources 是 prepareResources 返回的图片资源，且只能有一项。
await Douyin.shareToContacts({ mediaType: 'image', resources })

// 网页链接：不需要下载网页或封面。
await Douyin.shareToContacts({
  mediaType: 'link',
  link: {
    url: 'https://example.com/share/123',
    title: '报告标题',
    description: '点击查看完整内容',
    thumbnailUrl: 'https://example.com/cover.jpg',
  },
})
```

上述单图示例需使用图片准备示例的 resources，不要使用视频示例的资源。好友链接需要 im.share 和页面链接验证，动态路径是否覆盖以后台规则为准。

### 5. 处理结果与异常

```ts
try {
  const result = await Douyin.shareToContacts({
    mediaType: 'link',
    link: { url: 'https://example.com/share/123', title: '标题', description: '描述' },
  }, { timeoutMs: 120000 })

  switch (result.status) {
    case 'success': // SDK 回调成功，不等于作品最终发布。
      break
    case 'cancelled': // 用户在抖音侧取消。
      break
    case 'failed':
    case 'unknown':
      console.log(result.nativeResponse)
      break
  }
}
catch (error) {
  // 本地参数、权限、原生桥接、等待超时等异常。
  const failure = error as { code?: string; message?: string }
  console.log(failure.code, failure.message)
}
```

## API

所有方法通过 `Douyin` 调用。也支持具名导入 `import { Douyin } from '...'`。请求中的未知字段会被拒绝，不会任意透传给原生 SDK。

| 方法 | 返回值 | 功能 |
| --- | --- | --- |
| configure(config) | Promise<void> | 初始化 |
| isAppInstalled() | Promise<boolean> | 检测抖音主版 |
| getCapabilities() | Promise<Capabilities> | 查询能力 |
| prepareResources(resources, options) | Promise<Resource[]> | 准备本地素材 |
| share(request, options?) | Promise<ShareResult> | 分享作品 |
| forwardToDaily(request, options?) | Promise<ShareResult> | 转发单张图片或单个视频到日常 |
| shareToContacts(request, options?) | Promise<ShareResult> | 好友/群分享 |
| cancelPendingShare() | Promise<void> | 停止本地等待 |

### configure(config)

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| clientKey | string | 是 | 抖音开放平台移动应用的 clientKey，不能为空 |

在调用其他查询、准备及分享方法前完成初始化。有分享等待时不能重新配置，会返回 E_BUSY。

### isAppInstalled()

无参数，返回是否安装抖音主版。安装成功不代表版本支持全部能力，也不代表开放平台账号已获得分享权限。

### getCapabilities()

无参数，返回以下字段；每项值均为 `supported`、`unsupported` 或 `unknown`：

| 字段 | 说明 |
| --- | --- |
| share | 作品分享 |
| shareToContacts | 好友/群分享 |
| shareToPublish | 直接进入发布页 |
| mixShare | 混合素材分享；当前版本固定 unsupported |

Android 调用对应官方能力查询。iOS 主版已安装时前三项返回 unknown，未安装时返回 unsupported；不会仅凭版本猜测支持。unknown 表示无法预检，不等于不支持，实际调用由 SDK 响应决定。

### prepareResources(resources, options)

resources 为 1–12 项资源。支持两种 Resource，字段不能混用：

| type | 参数 | 平台 | 说明 |
| --- | --- | --- | --- |
| file | uri: string | Android / iOS | file:/// 本地文件；Android 额外接受可读取的 content:// |
| photoAsset | localIdentifier: string | iOS | 系统相册资源标识，不是文件路径 |

options：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| mediaType | image / video | 是 | — | 准备的素材类型 |
| allowPhotoLibraryWrite | boolean | 否 | false | 允许 iOS 本地文件显式写入相册；Android 不使用此选项 |

返回适合后续分享的 Resource[]。iOS 已有相册资源校验类型和可访问性；导入文件需提前获得 readWrite 权限，并传 true。图片/视频会留在用户相册，库不自动删除，重复导入可能产生重复资产。

Android 此方法校验读取能力并返回原资源；实际分享时复制到专用缓存并授权给抖音，每个缓存文件上限 512 MiB，必须可判断扩展名/MIME，不转码。正常回调后清理；本地取消/超时后延迟约 24 小时清理，进程结束时在下次 configure 清理过期项。

HTTP 图片/视频必须由业务先下载。链接卡片的 url / thumbnailUrl 不受此限制。

### share(request, options?)

request：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| mediaType | image / video | 是 | — | 作品媒体类型 |
| resources | Resource[] | 是 | — | 1–12 项，同一媒体类型；建议先 prepareResources |
| targetPage | edit / publish | 否 | edit | publish 只允许一个视频 |
| imageAlbumMode | boolean | 否 | false | 仅图片可设置；图集模式 |
| title | string | 否 | — | 非空作品文案，不是纯文字发布 |
| state | string | 否 | — | 非空上下文，传给官方 SDK，不作为库内部关联 ID |

图片尺寸、视频时长及标题限制仍受原生 SDK 与抖音版本约束。库不截断、不转码、不静默降级；图片不能直接指定 publish。

### forwardToDaily(request, options?)

初始化后，用 `prepareResources` 准备一项本地图片或视频资源，再传给此方法。抖音开放平台需开通 `aweme.forward`；SDK 返回值仍为 `ShareResult`。可选的 `options.timeoutMs` 与 `share` 相同。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| mediaType | `'image' \| 'video'` | 必填，选择素材类型 |
| resources | `[Resource]` | 必填，仅允许一个已准备的素材 |
| state | string | 选填，分享上下文 |

```ts
const resources = await Douyin.prepareResources(
  [{ type: 'file', uri: 'file:///local/image.jpg' }],
  { mediaType: 'image', allowPhotoLibraryWrite: true },
)

await Douyin.forwardToDaily({
  mediaType: 'image',
  resources: [resources[0]],
})
```

### shareToContacts(request, options?)

支持以下两种互斥请求：

| 参数 | 单图请求 | 链接请求 |
| --- | --- | --- |
| mediaType | image，必填 | link，必填 |
| resources | Resource[]，必填且仅一项 | 不允许 |
| link | 不允许 | Link 对象，必填 |
| state | 可选非空 string | 可选非空 string |

Link 参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| url | string | 是 | 完整 HTTPS 网页地址 |
| title | string | 是 | 非空卡片标题 |
| description | string | 是 | 非空卡片描述 |
| thumbnailUrl | string | 否 | HTTPS 远程封面图 |

URL 不接受内嵌账号密码。不支持好友视频、多图、纯文本、HTML 源码或任意文件附件。

### 分享公共 options

share / shareToContacts 的第二个参数：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| timeoutMs | number | 否 | 120000 | 本地等待毫秒数，整数 1000–600000 |

这是库的等待策略，不是抖音发布时限。一次只能等待一个分享请求，其他请求返回 E_BUSY。不自动重试，回到前台不判定成功。

### cancelPendingShare()

无参数。终止本地等待，使等待中的分享 Promise reject E_CANCELLED；没有等待时不执行任何操作。不会撤销抖音内正在进行的分享。超时同样仅终止本地等待，返回 E_TIMEOUT。进程重建后不会恢复旧 Promise。

## 返回结果

ShareResult：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| status | success / cancelled / failed / unknown | SDK 回调阶段的统一状态 |
| platform | android / ios | 响应平台 |
| nativeResponse | Record<string, unknown> | 原生诊断信息 |

用户取消、官方 SDK 业务失败通过 resolve 返回；本地异常通过 reject 返回。Android 保留 errorCode/errorMsg，作品额外保留 state/subErrorCode；iOS 保留 isSucceed/errCode/errString/shareState/subErrorCode/state。不要跨平台复用错误码含义。

Android 回调要求官方 callbackExtras 的内部关联值匹配；旧抖音若不返回会超时。iOS 按请求关联过滤迟到回调。更多联调事项见 [验证记录](docs/VALIDATION.md)。

## 本地错误码

| 错误码 | 含义 / 处理 |
| --- | --- |
| E_NOT_LINKED | 原生模块未加载，安装 Pods 后重新编译 |
| E_NOT_CONFIGURED | 先 configure |
| E_INVALID_ARGUMENT | 检查必填、未知字段及互斥参数 |
| E_BUSY | 已有请求在等待，或分享期间重新配置 |
| E_NOT_INSTALLED | 未安装抖音主版 |
| E_UNSUPPORTED | 平台或抖音版本不支持该能力 |
| E_PERMISSION | 宿主需先申请相册权限 |
| E_PHOTO_WRITE_REQUIRED | iOS 文件导入需显式允许写相册 |
| E_RESOURCE / E_RESOURCE_FORMAT | 素材不可读、类型或格式不符 |
| E_RESOURCE_TOO_LARGE | 超过 Android 缓存文件大小上限 |
| E_TIMEOUT / E_CANCELLED | 等待超时 / 主动停止本地等待 |
| E_SEND_FAILED | 原生 SDK 拒绝发起请求 |
| E_CONFIGURE | 注册 SDK 失败 |
| E_NO_ACTIVITY | Android 没有可用 Activity |
| E_INVALIDATED | RN 实例已失效 |
| E_NATIVE | 其他原生异常，结合 message 排查 |

## 开发与发布

```bash
npm install
npm run typecheck
npm test
npm run release:check
```

[发布说明](docs/RELEASING.md) · [产品文档](docs/PRD.md) · [验证记录](docs/VALIDATION.md)

## License

[MIT](LICENSE)。仅覆盖本桥接库；抖音官方 SDK 遵循其自己的许可。
