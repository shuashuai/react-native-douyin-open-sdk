# npm 与 Git 发布

Git 远程： https://github.com/shuashuai/react-native-douyin-open-sdk.git
npm 发布账号：`code_shuai`（个人账号）。GitHub 仓库所有者为 `shuashuai`，两者不同。

当前包名：react-native-douyin-open-sdk；版本 0.1.0；公开发布至 https://registry.npmjs.org/。

## 尚需提供/确认的信息

- 已确认 npm 个人账号为 `code_shuai`；登录后核对 npm whoami 输出必须为该账号。
- 当前保留无 scope 包名 `react-native-douyin-open-sdk`；若改用个人 scope，可使用 `@code_shuai/react-native-douyin-open-sdk`，需同步 package 和示例 import。
- 可选的作者公开姓名/邮箱，目前仅使用 GitHub 用户名，不臆造邮箱。
- 当前为待真机联调版本，建议首次用 next 标签；是否正式 latest 在发布时确定。

认证在本机通过 npm login 完成，不要把密码、OTP 或 token 写进源码/聊天。发布时由账号持有人完成需要的认证步骤。尚未配置 GitHub Actions 自动发布，也未保存 npm 凭证。

## 本地检查（不会发布）

```sh
npm install
npm run release:check
```

prepublishOnly 会构建、运行测试并检查入口及仓库元信息；npm pack 不会执行 prepublishOnly，所以要先运行 release:check。不要用 --ignore-scripts 绕过实际发布检查。

## 提交与推送（由维护者执行）

```sh
git add .
git commit -m "feat: initial Douyin sharing SDK"
git push -u origin main
git tag v0.1.0
git push origin v0.1.0
```

先确认远程历史，若仓库已有 README 等提交，需要正常合并后推送，不强制覆盖。podspec source 使用 v0.1.0 风格标签，必须与 package.json 版本一致。修改版本后重新生成 lib 并检查。

## 发布（仅在明确批准后执行）

```sh
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
npm view react-native-douyin-open-sdk --registry=https://registry.npmjs.org/
npm publish --tag next
```

发布账号核对：`npm whoami` 应输出 `code_shuai`。npm 账号名不需要写入 package.json 的 author 或 publishConfig，也不表示拥有任何已存在同名包的权限。

view 若显示包已存在，确认账号发布权限或选择其他名称；404 仅说明当时未找到包，不保证最终注册成功。正式 latest 发布策略需维护者确认。任何已发布的同版本都不能直接覆盖。

发布前仍需完成 VALIDATION.md 列出的宿主链接和真机联调。元信息检查不是原生设备验证，不会自动发布或推送。

官方参考：
- https://docs.npmjs.com/cli/v11/configuring-npm/package-json/
- https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/
