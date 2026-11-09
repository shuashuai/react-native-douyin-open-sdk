# 官方接口差异核对

核对日期：2026-11-09。以下为公开官方文档事实；最终符号、字段类型及版本能力必须在开发时下载选定版本 SDK、核对头文件/依赖并编译确认。本文不声称已验证二进制。

## 作品分享

| 项目 | Android | iOS |
| --- | --- | --- |
| 发送 | DouYinOpenApi.share(Share.Request) | DouyinOpenSDKShareRequest.sendShareRequestWithCompleteBlock: |
| 素材 | mMediaContent 包含 ImageObject.mImagePaths / VideoObject.mVideoPaths | mediaType 与 localIdentifiers |
| 本地资源 | 本地路径；按版本处理 FileProvider URI 授权 | 系统相册资源 local identifier |
| 发布目标 | shareToPublish；通过 isAppSupportShareToPublish 判断 | landedPageType 区分剪辑、编辑、发布 |
| 直接发布页 | 文档仅支持单视频 | 文档仅支持单视频 |
| 图集 | 具体符号需查所选 SDK | imageAlbumMode |
| 混合素材 | 文档提供 MixObject 和 isAppSupportMixShare | 所查文档未确认对等能力，不承诺支持 |
| 回调 | Activity / IApiEventHandler.onResp | completion block |

来源：[Android 分享](https://open.douyin.com/platform/resource/docs/develop/share/android)、[iOS 分享](https://open.douyin.com/platform/resource/docs/develop/share/ios/)。

不能统一假设图片张数、宽高比、时长、目标页在两端一致。文档有版本差异，开发时基于锁定版本给出限制表。作品文案字段也需核对两端声明：iOS 文档提到 title，但示例类型写法不一致；不据此臆造 Android 同名字段。

## 好友/群分享

| 项目 | Android | iOS |
| --- | --- | --- |
| 请求/发送 | ShareToContact.Request / shareToContacts | 同一 ShareRequest + shareAction=BDOpenPlatformShareTypeShareContentToIM |
| 图片 | 单张本地图片 | 单张相册资源 |
| 网页对象 | ContactHtmlObject | BDOpenPlatformShareLink |
| URL | setHtml | linkURLString |
| 标题 | setTitle | linkTitle |
| 描述 | setDiscription（官方拼写） | linkDescription |
| 封面 | setThumbUrl，远程图片 | linkCoverURLString |
| 响应诊断 | errorCode / errorMsg | errCode / errString / shareState |

来源：[Android 好友分享](https://open.douyin.com/platform/resource/docs/develop/share/android-share-with-douyin)、[iOS 好友分享](https://open.douyin.com/platform/resource/docs/develop/share/ios-share-with-douyin/)。

以上接口提供单图和链接能力，不能据此承诺视频、多图、纯文本或通用文件附件发送。Android 文档要求 im.share 权限并进行链接验证；动态路径是否全部覆盖尚未确认，不把同域名等同于已获准。

## 接入及版本

[SDK 概述](https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/sdk/mobile-app/sdk) 当前列出 Android 0.2.0.9、iOS 4.1.8；[旧 Android 接入页](https://open.douyin.com/platform/resource/docs/develop/guide/douyin-sdk/android) 仍列 0.1.9.0。不照抄旧 IM 文档中的仓库地址和版本，最终以官方当前下载页与实际可用依赖为准。

接入需核对 clientKey、Android 包名/签名、包可见性、FileProvider、回调 Activity，以及 iOS Bundle ID、官方回跳配置、相册用途声明和授权。具体配置键待选定版本后写进安装文档。SDK 不接收 clientSecret。

## 尚待验证，不能当作已确认

- 锁定版本 SDK 的完整请求字段、枚举值、能力查询方法和标题/话题能力。
- iOS 安装检测/初始化/回跳方法的精确签名。
- SDK 响应的成功阶段与用户最终发布、发送之间的关系。
- 未回跳、取消、冷启动回跳和进程重建行为。
- 当前 RN 0.83 / 新架构兼容性；iOS 与 Android 真机结果。

## RN 封装决策（PRD 1.0 已确认）

以上差异属于原生事实，不要求业务逐个平台调用。RN 层采用统一 share/shareToContacts，链接统一 url/title/description/thumbnailUrl，内部适配原生字段。公开响应保留 nativeResponse；资源类型、能力和专属选项显式标注。原生字段名不同本身不是拆分平台命名空间的理由。详见 PRD 第 2–4 节。

## 已核对实际二进制声明（实现阶段）

Android 0.2.0.10 / 0.2.0.11：实际 API 位于 com.bytedance.sdk.open.douyin.api.DouYinOpenApi。初始化使用 initConfig + DouYinOpenSDKConfig.Builder。图集存在 ImageAlbumObject.setImageAlbum；作品文案存在 Share.Request.newShare + ShareParam.titleObject.title。

iOS 4.2.5：实际好友 shareAction 枚举为 DouyinOpenSDKShareTypeShareContentToIM（旧文档 BDOpenPlatform 前缀已变更）。链接类为 DouyinOpenSDKShareLink。文案类为 DouyinOpenSDKShareTitle，正文属性 text。初始化 registerAppId，安装主版检测由系统 canOpenURL(snssdk1128) 完成；没有对等可靠的细项能力查询，返回 unknown。

Android 0.2.0.11 的 polaris 传递依赖在官方 release/snapshot 仓库无法解析；选用没有此问题的 0.2.0.10，未排除安全依赖。两端媒体混合能力不纳入首期；已发现 iOS 新版声明 Mix 枚举，但不因有枚举就承诺首期支持。

已完成 TS、Android 库构建、iOS 真机目标对象编译；回调语义、账号权限、App 新架构运行及真机交互仍需联调。详细记录见 VALIDATION.md。
