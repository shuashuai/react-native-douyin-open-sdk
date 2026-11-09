# SDK 0.1.0 验证记录

日期：2026-11-09。所有操作仅发生于独立 SDK/临时检查目录，promoter-app 仅提供只读 RN 头文件和已有工具，没有修改该项目。

## 通过

- TypeScript 5.8.3 对源码完整 typecheck/build；生成 JS 和声明。
- 10 项 Node 测试：初始化约束、未知字段、作品参数、好友链接/图片约束、并发与重新配置、原生响应保留、取消、超时错误码、迟到回调隔离、失败释放、素材准备参数。
- Android：官方 0.2.0.10 AAR + RN 0.83.3，独立临时 Gradle 宿主 :sdk:assembleDebug 通过。AGP 9.0.0、Gradle 9.3.1、compileSdk 36、Java 17，生成 AAR。存在上游/兼容 API 弃用提示，不影响编译。
- iOS：官方 4.2.5 真实头文件 + RN 0.83.3，Simulator 语法检查及 arm64 iphoneos 对象文件编译通过（ARC、C++20、deployment 15.1、Xcode SDK 26.2）。
- CocoaPods CDN 可取得 DouyinOpenSDK 4.2.5 podspec，与官方 ZIP 匹配。

## 上游/环境限制

- 尝试 Android 0.2.0.11 完整构建：polaris:1.1.9.0.1-bugfix 无法解析，官方 release 与示例 snapshot 仓库均无此 POM。没有用排除依赖方式掩盖，锁定上一正式版 0.2.0.10 并重新构建通过。
- 初次 AGP 9.2.1 要求本机没有的 Gradle 9.4.1；临时宿主改为兼容的 AGP 9.0.0。没有改动任何 App 的构建版本。
- 官方 iOS Pod 为 framework，排除模拟器 arm64。语法检查不是模拟器链接成功，优先真机。
- 没有声称完成独立 SDK npm install 的全量依赖安装。TS 编译与测试使用现有只读依赖，在临时目录执行；发布产物不包含指向主项目的 node_modules 链接。

## 必须进行的设备验收

尚无 clientKey、登记签名/Bundle ID、批准的 im.share/链接配置或测试设备会话；因此以下未验证：

1. 完整 iOS 宿主 pod install、链接与启动；RN 新架构真机互操作、自动链接。
2. Android 宿主合并 Manifest/R8 后在真机运行。
3. 图片、图集、视频编辑/单视频发布、作品文案；素材尺寸/时长边界。
4. 好友单图、验证域名链接/封面、动态路径范围。
5. Android callbackExtras 实机是否完整返回；SDK 类型匹配、取消、超时及迟到回调。
6. iOS AppDelegate/UIScene 回跳、冷启动、权限 limited/拒绝、抖音侧相册授权。
7. 素材复制、URI 授权与24小时清理；iOS 显式相册导入保留、不自动删图。
8. 无抖音、旧抖音、缺少账号 scope、无效 clientKey/签名、进程被杀。

回调 success 仅代表官方 SDK 响应阶段，不证明最终发布/送达。示例为集成屏幕，不能当成已配置的完整宿主 App。

最终检查：目标 SDK 目录中的 Node 测试再次通过；Android 最终源码含独立 DouyinFileProvider 再构建通过。npm pack 成功，包不包含 node_modules、宿主路径链接或构建目录。自动链接配置显式包含在发布文件列表中。
