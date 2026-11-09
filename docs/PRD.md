# RN 抖音 Open SDK 产品与 API 设计

版本：1.0｜2026-11-09｜产品范围与设计原则已确认，SDK 0.1.0 已实现，待真机联调。

## 1. 目标与边界

提供独立、可复用的 React Native 原生桥接包。调用者按抖音官方文档理解能力，通过 RN 文档找到平台接口映射。首期覆盖作品图片/视频分享、好友单图/链接分享及必要初始化、能力查询、回调处理。

不做登录授权、服务端发布、数据统计、ShareID 申请、TikTok 或抖音极速版适配；话题、贴纸、小程序挂载列为后续扩展，首期不承诺。不是完整 Open SDK 的所有能力封装。

不加入图片下载、静默相册写入、海报生成、文件转链接、剪贴板、提示弹窗、AI 或 H5 bridge。业务负责素材来源、权限和交互；资源格式转换按第 3 节显式适配约定；SDK 文档说明原生资源与权限要求。Android 必要的临时 URI 授权属于桥接适配，不属于业务下载。

## 2. API 决策：统一跨平台接口

公共能力使用统一 API，SDK 内部完成 Android/iOS 适配。调用者无需为了相同能力反复判断 Platform.OS。不采用平台命名空间作为主入口，也不要求 RN 方法与原生方法逐字同名。保留官方能力语义，README 逐项列出 RN → 官方方法映射。

参考：React Native Share.share、react-native-share Share.open、GoogleSignin.configure/signIn 都使用统一入口并标注平台参数。这是参考项目的共同模式，不是所有 RN 库必须遵循的标准。

| RN 拟议 API | Android 映射 | iOS 映射 |
| --- | --- | --- |
| configure(config) | DouYinOpenApiFactory.init | 初始化符号待所选 SDK 核对 |
| share(request) | DouYinOpenApi.share | ShareRequest + sendShareRequestWithCompleteBlock: |
| shareToContacts(request) | DouYinOpenApi.shareToContacts | ShareRequest 设置 IM shareAction 后发送 |
| isAppInstalled() | 原生安装检测 | 原生安装检测 |
| getCapabilities() | 官方能力查询及实际可用能力 | 官方能力查询及实际可用能力 |

上述接口从 Douyin 导出，异步操作返回 Promise。configure 的具体完成语义及初始化时机开发时核对。getCapabilities 使用 supported / unsupported / unknown 三态，无法确认不能返回支持；能力检测不代表开放平台账号权限已获批。安装检测也不代替能力检测。

## 3. 参数模型与示例

以下为 RN 设计草案，不是官方原生接口的逐字复制，开发时基于锁定 SDK 确认完整类型。

- 相同语义、不同字段名：统一公共名称，由 SDK 映射。
- 平台专有选项：少量可直接标注，仅在选项多时归入 ios/android 分组。每项注明平台、默认值、版本和不支持时的行为；当前尚未核对的原生字段不开放为任意透传对象。
- 能力差异：通过 getCapabilities 查询；当前平台不支持的有效请求明确返回 E_UNSUPPORTED，不悄悄降级。仅针对另一平台的已知配置项可不执行，但须文档明确；未知字段拒绝。
- 资源、目标页面、结果语义无法等价时，不以统一名字隐藏限制。类型约束、运行时校验和平台兼容表同时维护。

```ts
await Douyin.configure({ clientKey: 'YOUR_CLIENT_KEY' })

await Douyin.share({
  mediaType: 'image',
  resources: [{ type: 'file', uri: 'file:///local/image.jpg' }],
  targetPage: 'edit',
})

await Douyin.shareToContacts({
  mediaType: 'link',
  link: {
    url: 'https://example.com/share/123',
    title: '标题',
    description: '描述',
    thumbnailUrl: 'https://example.com/cover.jpg',
  },
})
```

公共字段映射：

| RN 字段 | Android | iOS |
| --- | --- | --- |
| mediaType/resources | 对应 ImageObject、VideoObject 等媒体对象 | mediaType/localIdentifiers |
| targetPage | 编辑页默认路径或 shareToPublish | landedPageType |
| link.url | ContactHtmlObject.setHtml | shareLink.linkURLString |
| link.title | setTitle | linkTitle |
| link.description | setDiscription | linkDescription |
| link.thumbnailUrl | setThumbUrl | linkCoverURLString |

targetPage 仅在两端均可表达的语义中定义；首期拟议 edit/publish，publish 仍遵守单视频限制。imageAlbumMode 等平台选项待核对后决定位置。文案/title 不直接承诺两端均支持，必须核对字段、权限及可编辑性后再纳入类型。不能因统一 API 宣称图片、视频、混合素材两端限制相同。

### 素材适配边界

拟议资源为判别联合：`{ type: 'file', uri }` 或 `{ type: 'photoAsset', localIdentifier }`。不把相册标识伪装成文件路径；文件类型由系统可读取资源和选定 SDK 限制决定，URI 格式需文档约定。

Android 文件资源的 FileProvider 授权由库适配；photoAsset 不是 Android 的通用资源类型，不支持时明确报错。iOS 相册标识直接使用；本地文件能否转成相册资源不是重命名能解决的。

为保留一致的调用体验，确定提供显式 `prepareResources(resources, options)` 资源准备方法，作为 SDK 技术适配能力而非 AI 业务。iOS 本地文件写入相册必须由调用者显式选择、提前申请权限，返回准备后的资源；不在 share 中静默写相册或触发授权。关闭此适配时，调用者自行准备 photoAsset。该方法的精确类型、生命周期及写入后残留说明在开发阶段核对官方 SDK 后补齐。写入必须显式触发，不自动删除用户相册资源。

上面的 file 示例仅适用于已支持该资源类型的平台；跨端业务应先使用 prepareResources 并按能力/权限处理结果，再调用统一分享方法。统一接口减少平台判断，不承诺消除所有素材来源差异。

首期不下载 HTTP 图片、不生成文字海报、不构建文件预览页。好友 link 中的完整 HTTPS 地址与作品媒体素材是两类不同资源。

## 4. 响应与错误

SDK 返回 Promise；resolve 表示收到了原生 SDK 响应，不一律表示分享成功或作品已发布。拟议统一结果包含 status（success/cancelled/failed/unknown）及 platform、nativeResponse；status 仅映射 SDK 响应阶段，不表示已发布。不能可靠归类时返回 unknown。原生字段在 nativeResponse 中按平台保留：Android errorCode/errorMsg，iOS isSucceed/errCode/errString/shareState，以及所选 SDK 可公开读取的其他响应字段。不能把 iOS 错误码表直接用于 Android。

用户取消和官方业务失败保留原生响应，调用者自行判断；参数非法、未初始化、重复调用、能力不支持、桥接内部异常使用明确的本地错误码。Promise 的具体 TS 联合类型在所选 SDK 声明核对后定稿。

首期每次仅允许一个未结束的分享请求；第二次立即返回 E_BUSY，不覆盖上一请求回调。不自动重试，避免重复拉起。回调去重并清理等待状态；state 不混用为内部请求 ID。

需要有可配置超时和本地取消等待机制；它们仅终止 RN 等待，不声称取消抖音中的操作。超时默认值开发阶段结合真机行为确定。App 回前台不直接判定成功。进程被杀后 Promise 不可恢复，README 明确说明；持久化结果恢复不纳入首期。

## 5. 安装与接入交付

目标先验证 promoter-app 当前 RN 0.83，支持其新架构配置；不承诺未测试的 RN 版本。发布前确定最低 RN/Android/iOS 版本、兼容矩阵和原生 SDK 固定版本。

Android：官方 Maven 依赖、Manifest、回调处理、FileProvider、R8 规则。iOS：Pod 依赖、回跳路由、相册配置。宿主已有 URL/Activity 处理不可被覆盖；须给出合并示例。不得把测试 clientKey、签名或业务域名写入库。

最终 README 包含安装、初始化、能力查询、两类分享、全部支持参数及必填性、平台限制、响应/错误码来源、回调阶段、资源权限、故障排查、完整官方链接。提供示例宿主，不把 SDK 测试按钮加到正式业务页面。

## 6. 开发顺序与验收

产品方案已确认；收到开始开发的指令后，先下载官方 SDK，核对类型并提交 API 差异补充；发现核心接口不符时回报，不默默更换 API。随后实现桥接、示例、构建和真机验证，最后接入业务。

验收覆盖：

- Android/iOS 编译及 RN 自动链接、新架构加载。
- 作品图片/视频、好友单图/链接，各走独立用例。
- SDK 请求字段与原生构造一一对应；没有静默吞字段。
- 未安装、旧版本、权限不足、资源无效、链接未验证、取消及官方失败。
- 分享回跳、重复调用、重复回调、超时、后台及冷启动。
- Android URI 可读与授权释放；iOS 相册有限授权/拒绝。
- 没有完成设备验证的能力明确标注，不以拉起成功代替发布成功。

## 7. 已确认的产品决策

用户已确认以下建议，作为首期实现基线：

1. 统一 `Douyin.configure`、`share`、`shareToContacts`、`isAppInstalled`、`getCapabilities`。公共参数统一，平台差异在 SDK 内映射，专属参数和限制明确标注。
2. 首期覆盖作品图片/视频分享、好友单图/链接分享。话题、贴纸、小程序挂载暂缓；纯文字转海报、HTML/文件生成预览页属于业务层。
3. SDK 不下载网络媒体素材。宿主负责下载鉴权、缓存、进度、重试及文件来源；SDK 接收本地文件或相册资源。链接卡片的网页 URL 和远程封面按官方协议传递，不要求先下载。
4. SDK 提供显式 `prepareResources` 资源适配。Android 处理文件访问授权；iOS 必要时将本地文件转为相册资源，由调用者显式触发并提前完成权限授权。share 不静默写相册，不自动删除用户相册资源。
5. 结果提供统一状态并保留原生响应及错误码。SDK 回调成功、拉起成功和最终发布成功不能混为一谈。不可靠的结果使用 unknown；取消与失败不伪装成成功。
6. 不自动重试分享；并发、超时与回调清理按第 4 节处理。

已确认的是产品范围、分层和对外 API 方向。官方精确符号、TS 签名、版本限制及响应映射需在开发时对照实际 SDK 定稿；不得以此扩大产品范围。

当前已在独立 SDK 项目实现代码与基础验证；没有修改 promoter-app。完整验证边界见 VALIDATION.md。

## 8. 参考模式

- [React Native Share](https://reactnative.dev/docs/share)：统一入口，注明平台参数和结果差异。
- [react-native-share](https://react-native-share.github.io/react-native-share/docs/share-open)：统一方法及平台支持矩阵。
- [Google Sign-In](https://react-native-google-signin.github.io/docs/original)：统一配置/调用，保留 iosClientId 等平台配置。

0.2 取代 0.1 的平台命名空间方案；官方事实与尚待核对事项仍见 PLATFORM-DIFFERENCES.md。示例为 API 设计说明，尚无可执行实现；开发时补齐精确类型。

## 9. 0.1.0 实现定稿

统一 API 已落地，含显式 prepareResources 和 cancelPendingShare。标题使用统一 title 字符串映射到两端真实 SDK 声明，imageAlbumMode 也为公共字段。锁定 Android 0.2.0.10 / iOS 4.2.5；能力查询、超时、资源保留及参数精确约束以 README 和 src/types.ts 为准。默认等待 120 秒为库策略，并非真机测得的平台时限。iOS 不可靠能力查询返回 unknown。示例屏幕不包含完整宿主身份或签名。
