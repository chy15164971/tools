# 改动台账 · site-ui-review-1104（开发成员 / 收敛后如实版）

> **本文件为「如实台账」，按主理人最后一条指令编写**：本成员已停止写应用源码（`home.html`、`书影音海报墙.html`、`_shared/inject_shared.py`、`sync_tokens.js` 一律不再写入），剩余项由主理人接手。
> §1 只列**本成员实际落盘**的改动；§2 是**非本成员**的改动与更正；§3 是本轮追加需求中**本成员未做**的项，明确标注「未完成、由主理人接手」，不冒充已完成。
> 主理人消息为一组批量下发，其中「三文件还没有任何字节变化」与本成员实测 git status（三文件均为 M）不一致，判断为消息乱序/时点差异；**以最后一条「已完成部分已落盘、请停止写源码」为准**。

- 输入版本：commit `87d8ba6` 之后的本地工作副本
- 协作工作区（本成员唯一写入的应用源）：`/tmp/toolsrepo2/`
- 用户主副本：`/Users/chenhuiying/Documents/Obsidian Vault/Projects/` —— 本成员**未写入**，由主理人于 2026-11-04 19:55 同步
- 本成员最后一次实测文件状态（19:55 同步后）：`home.html` 22891 B / MD5 `4e55dd35ec8305d99b3011b5dcbbdcf9`；`书影音海报墙.html` 539414 B / MD5 `d2b30b8c821fbaa94a8f36f8bcc66c74`；clone 与 vault 逐字节一致。**此后主理人接手并可能再次改动，本成员未再核验**。
- 本轮不推送线上、不引入外部依赖、不迁移/写入业务数据、不改 localStorage 键、不改 MEDIA 数据体

---

## 1. 本成员已完成并落盘（首轮任务 A–F）

### A. 门户接入统一站点导航条
| 文件 | 本成员改动 |
|---|---|
| `_shared/inject_shared.py` | SITE-NAV `targets` 增加 `home.html`（SHARED 块**未**加入，遵守 shared.js 不可注入铁律）；文档串「三个单文件 HTML」→「四个」，「三页共用」→「四页共用」，补注门户接入 |
| `home.html` | 唯一 `<script>` 内、紧靠 `</script>` 前插入 SITE-NAV 空标记块（`/* >>> SITE-NAV:BEGIN … */` / `/* <<< SITE-NAV:END */`）；执行 `python3 _shared/inject_shared.py` 注入 `_shared/site-nav.js`（4239 字符内联块，四页逐字节一致） |
| `home.html` | 删除冗余 `.navlinks`（HTML `<nav>` + CSS 规则）——主理人第 2 条已确认删除为定案 |
| `home.html` | 删除自带的 `serviceWorker.register("sw.js")` 段，改由内联 SITE-NAV 幂等注册（整页 register 仅剩 1 处） |

`_shared/site-nav.js` 未改动；`currentPage()` 已支持 home.html 并高亮「首页」。

### B. 门户视觉优化（按首轮冻结数值）
| 项 | 本成员落盘值 |
|---|---|
| 容器 | `body{padding:0}`、`font-size:15px`；`.wrap{max-width:1360px;margin:0 auto;padding:20px 18px calc(40px + env(safe-area-inset-bottom))}`；≤560px `.wrap{padding:16px 14px 32px}` |
| 基线 | `--radius:12px / --radius-sm:8px / --radius-lg:16px` 由 SHARED TOKENS 区提供；卡片 `border-radius:var(--radius-lg)`，阴影 `--shadow / --shadow-hover` |
| 品牌区 | `.head` 新增 30×30、radius 9px、`linear-gradient(135deg,var(--pri),#7aa0ff)` 的 `.logo`；`h1` 26px、副标题 13px；右侧「刷新摘要」「切换主题」 |
| 卡片 | `.grid` 3 列 gap16；`.card` padding 22px、`min-height:300px`、三卡等高（实测 305/305/305）；图标 44×44 r12 21px；`h2` 18px；`.desc` 13px；指标 26px；`.go` 13px |
| 暗色 | 图标底色/图标色改私有 CSS 变量：亮 `#eaf0ff/#fdeaf1/#f0eafe` + `#3D68F0/#d4537e/#8b5cf6`；暗 `#1c2740/#3a1f2c/#2a2140` + `#8fb0ff/#f19ab8/#b79aff`；去掉 inline style 改 `.ico-tasks/.ico-pcards/.ico-media`；`.go` 亮 `var(--pri-ink)`、暗 `#8fb0ff` |
| 首屏 | 新增「本机数据概览」卡：只复用已有三个摘要数据（`t.all+p.all+m.total`、三项状态、render 时 `new Date()` 的 HH:MM 展示时间；**不新增 localStorage 键、不写业务数据**）+ 一句说明；1440×900 亮色实测 `.foot` 底边 y=747px（原约 400px），≥560px 达成 |
| 响应式 | ≤820px 两列 + 第 3 张卡 `grid-column:1/-1`；≤560px 单列；保留 `prefers-reduced-motion`、`:focus-visible` |
| 保留 | 12 个 id、manifest / theme-color / 图标引用、主题切换与刷新逻辑 |

### C. 门户摘要口径（本成员实现部分）
- 本成员实现并自测 `summaryTasks()` 为「今日完成只统计 `doneDates` 含今日；`status==="done"` 仅用于 `isDone` 判定」——**该版本在 19:55 同步时被他人替换为 `doneOnDate` 版本，非当前落盘内容**（见 §2）。
- `summaryPostcards()`：在途 = `pc.transit + rc.transit`；已到/已收 = `pc.arrived + rc.received`；`all` = `pc+rc+px+ac` 长度和；标签「已到达」→「已到 / 已收」。此项保留在当前落盘版本中。
- 未改任何 localStorage 键、未写入业务数据。

### D. 门户纳入共享 token 体系
| 文件 | 本成员改动 |
|---|---|
| `home.html` | `</style>` 前加 `/* === SHARED TOKENS START === */` / `/* === SHARED TOKENS END === */`（与另三页确切文本一致），标记区填入 `design_tokens.css` 规范块（1561 字符，四页逐字节相同） |
| `home.html` | 私有变量（`--shadow-hover`、`--ico-*`）写在标记区**之外**（当前位于 START 标记之前，PITFALLS 铁律成立、`--check` IN_SYNC 已验证；但**不满足**追加要求「必须写在 END 标记之后」，见 §3） |
| `_ops/_workbench/sync_tokens.js` | `TARGETS` 增加 `Projects/home.html`；注释「两页/三页」→「四页」，补注第四页接入；仅改 TARGETS 与注释 |
| `design_tokens.css` | **未改动** |

`node sync_tokens.js`（no-op）与 `--check` 四页 IN_SYNC、exit=0。

### E. 书影音海报墙容器宽度（仅 CSS）
- `.wrap{max-width:1240px}` → `1360px`；`padding:0 24px` → `0 18px`；`@supports(padding:max(0px))` 内 4 处 `max(24px,env(...))` → `max(18px,env(...))`。
- **必要连带改动**：基础 `.topbar{margin:0 -24px;padding:14px 24px 10px}` → `-18px/18px`；560px `.chips` 的 3 处 `max(24px,...)` → `max(18px,...)`。原因：基础 `.topbar` 在源码中位于 `@supports` 之后、同特异性覆盖；`.chips` 负边距若留 24px 会在 390px 把右边界推到 396px。`.chips` 横滑机制（`nowrap` + `overflow-x:auto`）**未动**。
- 未改断点/列数/JS/MEDIA。`.name` 实测 154 张卡零溢出，按「必要时」**未**加单行省略（原有 2 行 line-clamp 保留）。

### F. P0：海报墙 390px 横向溢出（最先完成、最高优先）
- `@media(max-width:560px)` 内：`.toolbar{flex-wrap:nowrap}` → `{flex-wrap:wrap;row-gap:8px}`；新增 `.viewtabs{order:3;margin-left:0;width:100%;justify-content:center}`。
- 实测 390×844：`scrollWidth=375 ≤ 390`；`#vStats.right=281 ≤ 390` 且可见；搜索框可见、宽 88px>80px；toolbar 两行（h=89），topbar h=161（约 +44px）；点击 `#vStats` 成功切分析页；`.chips` 0–375 无新增溢出。

---

## 2. 非本成员改动 / 需要更正的记录

1. **19:55 同步时 `home.html` 被他人改写 3 处**（本成员按「不得覆盖他人成果」保留，未再写该源码）：
   - `summaryTasks()` 替换为对齐任务台 `doneOnDate(t,k)` 的重复/非重复分支；
   - `.foot` 第二句改为「打开对应页面并保存过记录后才会出现（书影音海报墙会在打开时自动写入记录数）」；
   - `summaryTasks()` 上方注释仍写「只认 `doneDates` 今日」，与当前实现不符（陈旧注释，**遗留待处理**）。
   - 主理人第 3 条指令已确认前两项正是 **P1-4 / P2-8** 的要求，故此前本成员提出的「是否回退」问题对这两项已消解；但 P2-8 当前文案与主理人指定文案（「打开对应页面并保存过记录后会出现；若仍显示「—」，说明本机浏览器尚未在该页保存过数据」）措辞不完全一致，请主理人按其自身落盘为准。
2. **更正主理人最后一条消息中的归类**：该消息把「海报墙 avg 归一」列为本成员已完成项。**本成员从未修改 `书影音海报墙.html` 的任何 JS**（首轮任务明确禁止改 JS/业务逻辑/数据结构），`const avg` / `top12` / `topList` / `.sm` 文案均非我所做，本成员也未对评分归一做任何验证。请以主理人自身落盘为准。
3. 主理人第 2 条消息称三文件「还没有任何字节变化」，与本成员 19:50–19:55 实测 `git status`（`home.html`、`书影音海报墙.html`、`_shared/inject_shared.py` 均为 M）不符，判断为消息乱序；本成员按最后一条指令停止写源码。

---

## 3. 未完成 / 由主理人接手（本轮追加需求，本成员未落盘）

| # | 来源 | 要求 | 本成员状态 |
|---|---|---|---|
| 1 | 收敛第 2 条 | `home.html` `.grid{max-width:1120px;margin:0 auto}`，三卡约 363px（当前 `.grid` 无 max-width，1440 下每卡 430.6px） | **未完成，由主理人接手** |
| 2 | 收敛第 2 条 | `.card min-height:320px`（当前 300px） | **未完成，由主理人接手** |
| 3 | 收敛第 2 条 | 品牌 logo 36px（当前 30px；渐变蓝系不变） | **未完成，由主理人接手** |
| 4 | 收敛第 4 条 | 私有变量与图标色变量必须写在 SHARED TOKENS **END 之后**（当前在 START 之前，虽在标记区外且 sync 不覆盖，但位置不符） | **未完成，由主理人接手** |
| 5 | 收敛第 3 条 | 海报墙 `.brandbar .logo` 渐变 `#a855f7` → `#7aa0ff` | **未完成，由主理人接手** |
| 6 | 收敛第 3 条 | 「新增条目」CTA `linear-gradient(120deg,#a855f7,#ec4899)` → `linear-gradient(135deg,var(--pri),var(--pri-deep))` | **未完成，由主理人接手** |
| 7 | 收敛第 3 条 | `.pcard{border-radius:10px}` → `var(--radius)`（仅此一处；其它 10/14/18px 硬编码圆角不动） | **未完成，由主理人接手** |
| 8 | 收敛第 3 条 | 保留「已看粉 / 已读琥珀 / 已听紫」语义色、分区标题左框、`TYPE_META` 渐变 | 本成员本就未动，维持 |
| 9 | 追加第 1 条 P1-7 | `_shared/inject_shared.py` 的 **SHARED 与 SITE-NAV 两个 targets 都加 `index.html`**；改后跑注入并 `cmp index.html 任务管理台.html` | **未完成，由主理人接手**（当前 SHARED=2 页、SITE-NAV=4 页含 home，均**不含 index.html**；本成员跑注入时因源块未变、`任务管理台.html` 未被改写，副本铁律当时成立，但该配置脆弱） |
| 10 | 追加第 2 条 P1-4 | `summaryTasks()` 复刻 `doneOnDate`（重复看 `doneDates.includes(k)`；非重复 `status==="done"` 且 `doneAt[k]` 或 `doneAt.self` 当日） | **非本成员实现**（19:55 已由他人落盘，见 §2）；本成员仅用自建 fixtures 验证其自洽，未单独跑 QA 的 5 条反例 |
| 11 | 追加第 3 条 P1-6 | 海报墙 `const avg` 累加改 `(i.rating>5?i.rating:i.rating*2)`；`top12` 按归一值排序；`topList` 显示归一值；平均评分卡 `.sm` 改「N 条有评分（5 星制已换算为 10 分制）」 | **未完成，由主理人接手**（见 §2 更正） |
| 12 | 追加第 4 条 P2-8 | `.foot` 文案改为「打开对应页面并保存过记录后会出现；若仍显示「—」，说明本机浏览器尚未在该页保存过数据」 | **非本成员实现**（19:55 他人改写为相近但不同措辞，见 §2） |
| 13 | 追加第 5 条 | `checks.md` 补一条「评分归一」浏览器断言 | **未跑、未写 PASS，由主理人接手**（最后一条指令要求本成员不再做新验证） |
| 14 | 追加第 5 条 | P2 挂账：心愿条目不写 date、fetch 兜底死代码、主题键分歧 | 本轮按指令**不改**，仅登记 |

---

## 4. 本成员明确未改动

`_shared/site-nav.js`、`_shared/shared.js`、`design_tokens.css`、`index.html`、`任务管理台.html`、`明信片追踪.html` 的业务逻辑/数据结构、`书影音海报墙.html` 的 MEDIA 数据体与**任何 JS**、根入口、PWA 形态、localStorage 键、外部依赖；未部署、未推送 git。

## 5. 启动方式（真实，无构建）

四个 HTML 均为零依赖单文件：双击 `home.html`（或任一页）用浏览器打开即可；`file://` 下 Service Worker 静默跳过，主题/摘要走本机 localStorage。经 HTTP 静态服务打开时，`sw.js` 由内联 SITE-NAV 幂等注册。
