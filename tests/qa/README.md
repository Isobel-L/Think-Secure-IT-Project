# ThinkSecure 自动化测试

这些脚本用于回归测试及发现上线风险，不是安全认证。应用仍为静态网站；新增的 npm 依赖仅用于开发测试，不需要复制到部署目录。

## 运行

在项目根目录打开 PowerShell，安装 Node.js 20 或以上版本：

```powershell
npm ci
$env:QA_BROWSER_CHANNEL = 'msedge'
npm test
```

没有 Edge 时可使用 Playwright Chromium：

```powershell
npx playwright install chromium
Remove-Item Env:QA_BROWSER_CHANNEL -ErrorAction SilentlyContinue
npm test
```

测试自动启动本地 HTTP 服务并关闭，不需要打开网站或启动其他服务器。每个用例有独立浏览器上下文。任何断言失败都会返回非零退出码。浏览器启动失败属于环境失败，不能把零用例报告当成通过。

结果写入 `test-results/<时间>/results.json` 和 `summary.md`，无障碍结果另存 `accessibility.json`。结果目录与 node_modules 不进入 Git。正式测试应保存报告、提交号、测试人和环境信息。

## 范围与限制

- 实际加载页面和 zxcvbn 4.4.2，检查六语言、五档评分与界面同步、跨页流程、PNG 下载、机器人开关、Quiz 全对/全错及重启。
- HIBP 泄露查询使用模拟响应，字体请求被替代，其余外部请求被阻止；不会向真实服务发送测试密码。正常、命中、429、503、挂起及异常响应均分别覆盖。
- 评分测试验证界面与评分库一致，不代表独立验证评分算法的安全准确性。
- Quiz 采用固定随机种子，读取题目答案安排全对/全错路径；不代表所有题库、人口组合都已覆盖。
- axe 扫描初始页面的指定 WCAG 规则；不能替代读屏、键盘完整流程及动态界面人工检查。
- `BOUND-01` 的 1024 字符上限与 12 秒请求超时是本轮提出的验收界限，应由团队确认后调整；没有上限不等于已证明浏览器崩溃。
- 默认 HTTP 测试不覆盖直接双击打开的 file:// 模式，也不验证正式站点 CDN、HTTPS、安全响应头或容量。

排查单项时可设置 `$env:QA_FILTER='QUIZ-'` 后执行 `npm test`。完成后执行 `Remove-Item Env:QA_FILTER` 再完整运行；筛选通过不能代替全量通过。

## 有界本地负载

```powershell
$env:QA_USERS = '50'
$env:QA_SECONDS = '10'
npm run test:load:local
```

结果为 `test-results/load-latest.json`。每个 worker 间隔 250ms 请求四个静态地址，不执行浏览器交互，不代表 50 个真实用户的完整会话。默认只启动本地服务。

只有在取得测试环境授权后才设置 `QA_LOAD_URL`；远程目标另需显式设置 `QA_ALLOW_REMOTE_LOAD=1`。不得把它直接用于第三方服务、HIBP 或未授权的生产压测。

上线人工清单见 `docs/public-release-test-checklist.md`，本轮结论见 `docs/public-release-test-report.md`。
