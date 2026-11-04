# 本轮 brief · 四页站点全量审查 + 门户页 UI 优化

## 目标
1. 对「站点统一」改造后的四个页面做全量审查：UI 视觉 / 交互流程 / 代码实现 / 业务逻辑 / 功能完整性。输出按优先级排序的问题清单，每项含「模块位置、当前表现、影响、具体修改建议、是否立即修改」，并说明已审范围与无明显问题的部分。
2. 重点核查 UI 协调性，尤其是**书影音海报墙**与另外两页的视觉差异：容器宽度、卡片尺寸、间距、对齐、比例、整体排版节奏；明确回答**「是否由容器宽度导致」**并给出量化证据。
3. 优化「独立页面」UI。主理人按上下文判定为新建的门户首页 `home.html`（用户反馈「还不是很好看」）；若成员发现用户可能指别的页面，只记录不确定项，不自行扩大改造范围。

## 项目与版本
- 本轮输入版本：commit `87d8ba6`（站点统一改造）后的工作副本
- 仓库克隆（协作工作区）：`/tmp/toolsrepo2/`
- 用户主副本：`/Users/chenhuiying/Documents/Obsidian Vault/Projects/`
- 共享源：`/tmp/toolsrepo2/_shared/site-nav.js`、`shared.js`、`inject_shared.py`；token 源 `/Users/chenhuiying/Documents/Obsidian Vault/_ops/_workbench/design_tokens.css` + `sync_tokens.js`
- 四个页面：`home.html`（门户）、`任务管理台.html`、`明信片追踪.html`、`书影音海报墙.html`；`index.html` 是任务台逐字节副本

## 主理人已完成的只读量测（1440×900 亮色，真实浏览器 computed style）
| 页 | .wrap max-width | 内容宽 | 左边距 | body 字号 | 首个卡片 | 栅格 |
|---|---|---|---|---|---|---|
| home.html | 960px | 960 | x=240 | **16px** | 309×293 / radius16 / pad20 | 3 列 gap16 |
| 任务管理台 | 1360px | 1332 | x=47 | 15px | 面板 radius16 pad12 | 面板式 |
| 明信片追踪 | 1360px | 1324 | x=58 | 15px | 面板 radius16 | 面板式 |
| 书影音海报墙 | **1240px** | **1192** | **x=117** | 15px | pcard 139×293 / radius10 | **8 列** gap16/12 |

- 统一导航条 `__wsn_bar`：三页均有（高 43px，全宽）；**home.html 没有**（`inject_shared.py` 的 SITE-NAV targets 不含它）。
- 门户页 CSS 变量是手写的，`--radius:16px`，而共享 `design_tokens.css` 是 `--radius:12px`；门户页不在 `sync_tokens.js` TARGETS 内，也不在 SHARED TOKENS 标记体系内。
- 海报墙 logo 用紫色渐变 `var(--pri),#a855f7`，另两页用蓝色 `var(--pri),#7aa0ff`；海报墙主按钮偏粉紫。
- 门户页首屏截图：下半屏大面积空白、无品牌标识、指标在 file:// 下显示「—」（属正常降级，线上有值）。

## 关键约束 / 铁律（违反会白屏或破坏数据）
1. 整份 `shared.js` **不可**注入海报墙与门户页（与海报墙 6 处同名顶层声明冲突）。导航条只能走独立 SITE-NAV 块。
2. 凡进 `SITE-NAV` / `SHARED` 内联块的代码必须同时写进对应源文件，并运行 `python3 _shared/inject_shared.py` 注入；注入后做逐字节一致性断言。
3. `index.html` 必须与 `任务管理台.html` 逐字节一致（发布铁律）。
4. 改共享 token 要改 `design_tokens.css` 后跑 `node sync_tokens.js --check` 三页 IN_SYNC；页面私有 token 不要写进标记区。
5. 不得改动 `书影音海报墙.html` 的 MEDIA 数据体（1731 条）与任何页面的业务逻辑/数据结构/localStorage 键。
6. 本次**不推送线上**（用户未授权部署）；交付本地工程 + 仓库克隆改动。

## 假设
- 用户要「审查报告 + 实际问题清单」，同时要「把独立页面 UI 优化掉」，即审查与实现都要做。
- 视觉优化允许自行采用合理默认值，不追问配色细节；不改业务行为。
- 允许用 `agent-browser`（已安装）做本地 file:// 截图与 DOM 量测；harness 在 `/tmp/harness.js`（52 项）、`/tmp/verify_partial.js`。

## 不做
- 不合并三页为 SPA；不改根入口（`/tools/` 仍直达任务台）；不接后端；不改 PWA 安装形态；不做大规模重构。
