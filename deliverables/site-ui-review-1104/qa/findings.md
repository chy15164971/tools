# QA 独立审查 · 问题清单（findings）

**输入版本**：`/tmp/toolsrepo2/` 工作副本，commit `87d8ba6`（站点统一改造），2026-11-04 19:28–19:46 只读快照；`git status --short` 仅 `?? deliverables/`，源码未被本成员改动。
**审查维度**：交互流程 / 代码实现 / 业务逻辑 / 功能完整性（UI 视觉协调性由 `ui-designer` 负责，本清单不重复；仅在交叉到交互/功能时记录）。
**方法**：源码静态只读 + 真实 Chromium（`agent-browser 0.27.0`，`file://` 双击场景）+ 既有回归桩。合成数据全部注入**独立会话** `qa1104` / `qaev`，未改动用户真实 localStorage；默认会话只做过一次只读打开。
**证据**：`qa/evidence/static-checks.txt`、`qa/evidence/browser-checks.txt`、`qa/evidence/harness-full.txt`、`qa/evidence/home-1440.png`、`home-390.png`、`home-1440-dark.png`、`mediawall-390.png`。
**标记**：`【实测复现】` = 真实浏览器按步骤复现；`【实测观察】` = 真实浏览器量测到状态；`【静态推断】` = 仅源码/配置推断，未端到端复现；`【已知·本轮实现项】` = brief 已量测、本轮开发正要修的基线状态。

> **⚠ 输入版本变化（19:50 起，需主理人知悉）**：本清单全部证据采集于 **19:28–19:46**，当时的输入是干净的 `87d8ba6` 工作副本（`git status` 仅 `?? deliverables/`）。**19:50 起开发者开始写入**，`git status` 变为 `M home.html`、`M _shared/inject_shared.py`（`home.html` mtime 19:50:26、`inject_shared.py` 19:50:32）。因此：
> - 本清单是**实现前基线**的结论，**不能当作实现后版本的验收结论**；
> - 19:50 的只读抽查显示 P1-1 / P1-2 / P1-3 正在被处理：`home.html` 已加 `SITE-NAV:BEGIN` 标记块与 `SHARED TOKENS START/END` 区、`--radius:12px`（16px 漂移已移除）、`.go` 改用 `--pri-ink` 且暗色 `#8fb0ff`；`inject_shared.py` 的 SITE-NAV targets 已加入 `home.html`；`home.html` 分块 `node --check` PASS。**这些实现后状态须按 `qa/test-plan.md` 重新判定，本清单不预埋「已通过」**；
> - 19:50 状态下仍有两个未闭环点：`inject_shared.py` targets **仍未包含 `index.html`**（P1-7 未处理）；`sync_tokens.js --check` 仍只报 3 页 IN_SYNC、克隆 `home.html` 与 vault 副本 **DIFFERENT**（主理人尚未同步 vault 与更新 TARGETS），对应 P1-2 / D-2；
> - 证据文件时间戳：`static-checks.txt` 19:42、`browser-checks.txt` 19:46、`harness-full.txt` 19:43、四张截图 19:39，**均早于源码改动**，与基线版本一致。

> **重要边界**：brief 铁律 5 规定「不得改动任何页面的业务逻辑/数据结构/localStorage 键」，status.md 限定开发者可写源码仅 `home.html`、`书影音海报墙.html`（仅限容器/视觉 CSS）、`_shared/site-nav.js`、`_shared/inject_shared.py`。因此下文多数**业务逻辑类**问题虽可复现，但**不在本轮开发者授权写入范围内**，是否修复需主理人决策（见末节）。

---

## 结论摘要

- **P0（白屏 / 数据丢失 / 不可启动）**：未发现。
- **核心条件当前未达成**：B1（门户统一导航条）、B3（门户纳入 token 体系）、B2（首屏品牌层次）——均为本轮实现目标，尚未实现；见 P1-1/P1-2。
- **新发现且需主理人决策的业务数字错误 3 项**：门户「今日完成」、门户「在途/已到达」、分析页「平均评分」（P1-4/5/6）。
- **工程契约潜在破坏点 1 项**：`inject_shared.py` 注入目标漏 `index.html`（P1-7），本轮一旦改动共享源文件即可能违反铁律 3 / D2。
- **主理人补充 6 点已逐条复核**（见下表）：其中 3 点与我的实测吻合、1 点方向需修正、1 点修正方案需更正（`doneDates` 口径）、1 点为新增静态隐患；`P2-16` 由静态推断**升级为实测复现**。
- 其余 P2（共 12 项）为文案准确性、口径完整性、窄屏溢出、主题不同步与工程一致性清理。

### 主理人补充结论复核（6 项，均已逐条核对并标注）

| # | 主理人静态结论 | 我的复核 | 标注 | 落点 |
|---|---|---|---|---|
| 1 | `summaryTasks()`「今日完成」把任何 `status==="done"` 的历史完成任务计入，口径高估；任务台状态为 todo/done + doneDates 数组 | **数字高估已实测复现**（合成 5 条 → 3，正确 2）。但补充口径「应为 doneDates 含今日」**不完整**：`任务管理台.html:4707-4717` 中一次性任务只 `t.status="done"` + `setDoneAt(...)`（`4095-4098` 非重复键为 `self`），**不写 `doneDates`**；`doneDates` 仅用于重复任务。`5035-5043 doneOnDate` 对非重复任务读 `doneAt[k]` / `doneAt.self`，对重复任务才读 `doneDates.includes(k)`。若按「doneDates 含今日」实现，一次性任务的当日完成会被漏计为 0 | 数字错误【实测复现】；修正方案【静态推断+源码复核】 | P1-4 + S3 |
| 2 | 「在途」只数 `postcards.transit`；「已到达」= `postcards.arrived + received` 全长；`received.transit` 应算在途、`received` 才算已收；枚举 `STATUS_ORDER=["unwritten","unsent","transit","arrived","returned"]`、`RECV_STATUS_ORDER=["transit","received"]` | 一致，且已实测复现（在途1/已到达3 vs 期望 2/2 或 1/1）。枚举位置：`明信片追踪.html:4864-4868`、`3475-3478`，保存结构 `2222-2224` | 【实测复现】 | P1-5 |
| 3 | 四页主题键不一致（门户 `wb_workbench_theme`+`wb_theme_v1`；任务台 `wb_taskhub_theme_v1`+`wb_theme_v1`；明信片 `wb_postcards_theme`+`wb_theme_v1`；海报墙仅 `wb_theme_v1`），需查私有键优先是否导致不同步 | 已复现，但**方向需修正**：门户切换会同时写 `wb_theme_v1`，因此**门户→三页是同步的**；不同步发生在**三页→门户**——门户一旦切过主题就留下 `wb_workbench_theme` 并优先读它，此后在任一子页切主题只改 `wb_theme_v1`，门户不跟随。实测：门户 dark → 明信片页切 light → 门户仍 dark、三页全 light | 【实测复现】（原 P2-16 由静态推断升级） | P2-16 + S1/S2 |
| 4 | 390px 海报墙 `scrollWidth=471`、`.viewtabs right=471`、`#vStats left=376`，其余三页无溢出 | 完全吻合，我独立测得同一组数值；1440/1024/768/560 均无溢出，home 390px 单列无溢出 | 【实测复现】 | P2-13 + browser-checks [E8] |
| 5 | 海报墙 `:root` 自带 `--bg:#F8FAFC / --ink:#1f2328 / --line:#e6e9ef`，末尾 SHARED TOKENS 块覆盖（实测 bodyBg 已是 `#f5f7fb`），双源维护隐患；私有 `--ink-soft` 不在共享 token 内 | 基线确认：`:root{` 共 2 处（`:13` 私有、`:512` 标记区），`SHARED TOKENS START` 在 `511`；`--ink-soft` 在 `:17`（亮）/`:419`（暗）；`design_tokens.css` 无 `--ink-soft`、无 `--shadow-hover`。当前渲染未见故障，属维护隐患 | 【静态推断】（结构已核实，未见功能故障） | 新增 P2-18 + S4/S6 |
| 6 | `fetchMediaCount` 正则 `{"title":` 数得静态 1731、不含自定义条目；「已记录」与「自定义条目」并列可能误导 | 一致（1731）。补充：常规路径下门户「已记录」读的是 `wb_mediawall_stats_v1.total` = `MEDIA.length`（**已含**自定义条目，实测 1733），1731 只出现在 `file://` 下且缓存/统计键都缺失的兜底分支（该分支实测不可达）。因此并列展示的真实歧义是「已记录 已包含自定义条目 2 条」却另列一个「自定义条目 2」，需在文案上说明包含关系 | 计数【实测观察】；并列歧义【静态推断】 | P2-9 / P2-12 |

> ui-designer 补充的 3 个「静默失效」陷阱（`inject_shared.py` 缺标记块静默 `return False`、`--shadow-hover` 不在共享规范 token、基线 `body padding` 导致导航条内缩）已复核为**源码事实**，其中第 1 条作为基线工程健壮性问题新增 P2-19，第 2/3 条属于实现后必验项，已写入 `qa/test-plan.md` §1.3 / §2.1 / §2.4。设计成员指明的「不算缺陷」（海报墙 section-title 语义分类色、明信片空数据态、home 999px 胶囊按钮）本清单均未列为问题。

---

## P0

无。五个 HTML 均可打开、无 JS 报错、无白屏；`harness.js` 52/52、`verify_partial.js` 通过。

---

## P1

### P1-1【已知·本轮实现项 / 实测复现】`home.html` 没有统一站点导航条，B1 未达成
- **模块/位置**：站点导航 · `_shared/inject_shared.py:29-37`（SITE-NAV targets 仅三页）、`home.html`（全文无 `SITE-NAV:BEGIN` 标记块）、`_shared/site-nav.js:13-18`（`PAGES` 已含 `home`）。
- **当前表现**：`home.html` 实测 `document.getElementById('__wsn_bar') === false`；三页 + `index.html` 均有 43px 导航条。门户只有自建 `.navlinks`（`home.html:78-82`），与三页不一致。
- **影响**：门户缺站点级入口与当前页高亮，B1 直接不达标；从门户跳到子页后无法一键回首页。
- **具体修改建议**：在 `home.html` 的 `<body>` 内加 `/* >>> SITE-NAV:BEGIN ... */` 标记块（由 `inject_shared.py` 注入），并把 `home.html` 加入 SITE-NAV targets；注入后断言「首页」带 `.__wsn_on[aria-current=page]`。**不要**把 `shared.js` 注入门户（铁律 1）。
- **是否需要立即修改**：**是**（本轮实现的核心项）。
- **证据**：`browser-checks.txt [E6]` 第一行 `home.html {"nav":false,"on":[]}`；`static-checks.txt D2` `home.html SITE-NAV NO BLOCK`；`home-1440.png`（截图顶部无导航条）。

### P1-2【已知·本轮实现项 / 实测复现】门户页未纳入共享 token 体系，且圆角/字号漂移，B3 未达成
- **模块/位置**：`sync_tokens.js:18-22`（TARGETS 仅 vault 三页，无 home.html）、`home.html:11-22`（手写 `:root`/`[data-theme=dark]`，无 `SHARED TOKENS START/END` 标记）、`home.html:15` `--radius:16px` vs `design_tokens.css` `--radius:12px`、`home.html:24` body `16px` vs 三页 `15px`。
- **当前表现**：computed style 实测 `home.html` `--radius:16px`、`body font-size:16px`、`.wrap max-width:960px`；`sync_tokens.js --check` 只报告三页 IN_SYNC，不覆盖门户。
- **影响**：B3 不达标；同一工作台三套 token 口径，后续改主色/圆角会漏掉门户。
- **具体修改建议**：给 `home.html` 加 `SHARED TOKENS START/END` 包裹区并填入 `design_tokens.css` 规范块（2 空格缩进）；把 `home.html` 加入 `sync_tokens.js` TARGETS。**注意**：`sync_tokens.js` 与 `design_tokens.css` 位于 `/Users/chenhuiying/Documents/Obsidian Vault/_ops/_workbench/`，**不在开发者可写路径**，需主理人同步并重建 vault 副本（见「需主理人决策」）。
- **是否需要立即修改**：**是**。
- **证据**：`static-checks.txt D3`（三行 IN_SYNC，无 home）；`home.html:15,24,27`；默认会话 eval `{"bodyFont":"16px","wrapMax":"960px","radius":"16px"}`。

### P1-3【实测复现】门户暗色主题「打开… →」链接对比度 3.59:1，低于 WCAG AA 4.5:1
- **模块/位置**：`home.html:52` `.go{color:var(--pri-deep)}`；`home.html:20` 暗色 `--pri-deep:#3D68F0`（亮暗同值）；暗色卡底 `--card:#171c2b`（`home.html:19`）。
- **当前表现**：亮色 4.73:1 ✓，暗色 **3.59:1** ✗（13px 常规字重）。同页其余文字暗色均 ≥6.67:1。
- **影响**：B1「亮/暗主题都可读」受影响的文字；暗色下三张卡的行动引导偏灰蓝、不易读。
- **具体修改建议**：暗色下让 `.go` 使用共享 `--pri-ink`（`design_tokens.css` 暗色值 `#8FABFF`，白/深底对比充足），或在 home 私有 token 中定义 `--go-ink`；与 P1-2 的 token 对齐一并做。
- **是否需要立即修改**：**是**（`home.html` 在开发者可写范围内）。
- **证据**：`browser-checks.txt [E9]` `{"theme":"dark","goFg":"rgb(61, 104, 240)","goBg":"rgb(23, 28, 43)","goRatio":3.59}`；亮色对照见会话记录 `go:4.73`。

### P1-4【实测复现】门户「今日完成」把**历史**已完成的一次性任务计入今日
- **模块/位置**：`home.html:156-169` `summaryTasks()`（判据 `String(t.status)==="done" || doneDates 含今日`）；对照任务台权威口径 `任务管理台.html:5020-5045`（`isTaskDone` / `doneInWindow` / `doneOnDate`：非重复任务看 `doneAt.self` 完成时刻，重复任务看 `doneDates`）。
- **当前表现**：注入 5 条任务（1 条 2020 年完成、1 条今日完成、1 条待办、1 条每日重复今日打卡、1 条每日重复历史打卡）→ 门户显示 `进行中 1 / 今日完成 3 / 全部记录 5`。按任务台 `doneOnDate(t, 今日)` 应为 **2**（仅「今天完成」「每日重复-今天打卡」），2020 年那条被误计。
- **影响**：首页核心指标系统性偏高；用户无法据此判断当日进度。另：「进行中」把有历史打卡的重复任务判为「已完成」（`isDone = status==="done" || doneDates.length>0`），与任务台 `isTaskDone` 一致但语义上「进行中」偏少，建议一并明确。
- **具体修改建议**：按 `doneOnDate` 口径改 `summaryTasks()`（非重复读 `doneAt[k]` / `doneAt.self` 的 `ymd`，重复读 `doneDates` 是否含今日）；**或**保留现算法但把标签改成「已完成」以名实相符。二选一需主理人定（涉及业务逻辑，见末节）。
- **⚠ 对主理人补充口径的更正**：补充结论写「应为 `doneDates` 含今日」，但 `任务管理台.html:4707-4717` 中**一次性任务完成时只写 `status="done"` 与 `doneAt.self`（`4095-4098` `doneAtKey` 非重复返回 `"self"`），并不写 `doneDates`**；`doneDates` 只服务重复任务（`5035-5043 doneOnDate` 分支明确）。若按「doneDates 含今日」实现，所有一次性任务的当日完成会被漏计为 0，比现在更糟。请以 `doneOnDate` / `doneInWindow`（`5022-5032`）为准。
- **是否需要立即修改**：**需主理人授权**（本轮开发者被禁止改业务逻辑/数据结构）。建议至少先改标签，成本最低且不碰数据。
- **证据**：`browser-checks.txt [E1]` `"mTaskDone":"3"`（期望 2）；`home.html:164-166`；`任务管理台.html:5035-5045`。

### P1-5【实测复现】门户「在途 / 已到达」混用数据范围，已到达把**在途的收到件**也算进去
- **模块/位置**：`home.html:171-181`；对照 `明信片追踪.html:2222-2224`（保存结构 `{postcards, received, proxies, activities, ...}`）、`3453-3478`（自有统计：寄出页「在途/已到」只看 `postcards.status`；收到页单独把 `received.status==="transit"` 计为「在途」、`"received"` 计为「已收」）、`2457 normalizeRecv`、`4864-4868` 状态枚举。
- **当前表现**：`transit = postcards.filter(status==="transit")`（仅寄出件）；`arrived = postcards.filter(status==="arrived").length + received.length`（**全部收到件，含在途**）。注入 3 寄出（transit / arrived / returned）+ 2 收到（received / transit）→ `在途 1 / 已到达 3 / 全部记录 7`。按页面自有口径应为 `在途 2 / 已到达 2`（寄出+收到合并）或 `在途 1 / 已到达 1`（仅寄出件），当前两指标范围不一致且已到达虚高 1。
- **影响**：明信片摘要数字失真；「在途」漏掉对方寄来仍在途的片，与明信片页 KPI 对不上。
- **具体修改建议**：统一范围——要么两项都只统计 `postcards`（`arrived` 去掉 `+ rc.length`），要么两项都覆盖 `postcards + received`（`transit` 加 `received.filter(transit)`，`arrived` 改 `received.filter(received)`）；或把标签改为「寄出在途 / 寄出已到 + 全部收到」。同样涉及业务逻辑，需授权。
- **是否需要立即修改**：**需主理人授权**。
- **补充口径对照（主理人）**：`明信片追踪.html:4864-4868` `STATUS_ORDER=["unwritten","unsent","transit","arrived","returned"]`、`RECV_STATUS_ORDER=["transit","received"]`；`3475-3478` 收到页把 `received.status==="transit"` 计「在途」、`"received"` 计「已收」，与门户把**全部** `received` 计入「已到达」直接冲突。
- **证据**：`browser-checks.txt [E1]` `"mPcTransit":"1","mPcArrived":"3","mPcAll":"7"`；`home.html:178-180`；`明信片追踪.html:3475-3478,4864-4868,2222-2224`。

### P1-6【实测复现】分析页「平均评分」未归一 5/10 分制，与同页评分分布、画像、TOP12 自相矛盾
- **模块/位置**：`书影音海报墙.html:2975` `const avg = a => ... s+i.rating ...`（原始值求平均）；对照同文件 `3020`（评分分布 `i.rating>5?i.rating:i.rating*2`）、`2924-2925`（画像 `avgV` 归一）、`2935/2948`（hits 归一）、`2471` 附近 `stars()`（`r>5?r/2:r`）、`3042-3047`（`top12` 用原始 `b.rating-a.rating` 排序并显示原始值）。`3398` 允许用户输入 ≤10 的任意评分，数据层确实可混用两种量纲。
- **当前表现**：受控数据 2 条（评分 9 与 4）→ 卡片显示「平均评分 **6.5** · 2 条有评分（**10 分制**）」；同页「我的评分分布」却把 4 归入 **8-9 分** 桶；「口碑之最 TOP12」显示 `五分制条目 … 4`。按全站归一规则应为 (9+8)/2 = **8.5**。
- **影响**：汇总分析的核心数字错误；同一页三处口径互相打架，用户无法信任评分统计。`harness.js` 的「星级十分制」用例只验证渲染无异常，**未覆盖**该一致性。
- **具体修改建议**：`avg` 内改为累加 `(i.rating>5?i.rating:i.rating*2)`；`top12` 排序与显示同步归一；`gRow`/`seenCard` 的「平均评分」随之中性修正。不改动 MEDIA 数据体与 localStorage 键。
- **是否需要立即修改**：**需主理人授权**（`书影音海报墙.html` 开发者仅可改容器/视觉 CSS）。
- **证据**：`browser-checks.txt [E3]`；`书影音海报墙.html:2975,3020,3042-3047`。

### P1-7【静态推断 + 实测基线】`inject_shared.py` 注入目标漏 `index.html`，任一共享源文件变更即违反铁律 3 / D2
- **模块/位置**：`_shared/inject_shared.py:20-38`（SHARED targets = 任务管理台/明信片追踪；SITE-NAV targets = 任务管理台/明信片追踪/海报墙；**均无 `index.html`**，也均无 `home.html`）。
- **当前表现**：当前 `cmp index.html 任务管理台.html` = IDENTICAL，故尚未暴露；但 `index.html` 是 `任务管理台.html` 的发布铁律副本，而 `任务管理台.html` 是两块的注入目标。只要本轮修改 `site-nav.js` 或 `shared.js` 并执行 `python3 _shared/inject_shared.py`（铁律 2 要求），`任务管理台.html` 与 `明信片追踪.html` 的内联块会被改写，`index.html` 保持不变 → 两者不再逐字节一致，D2 失败、根入口 `/tools/` 仍是旧导航。
- **影响**：发布铁律破坏，且失败发生在注入之后、易被漏检。
- **具体修改建议**：把 `index.html` 同时加入 SHARED 与 SITE-NAV 的 targets；或在 `main()` 末尾加 `shutil.copyfile(任务管理台.html, index.html)`；或在 D2 断言中把 `cmp` 列为注入后必跑项。同时把 `home.html` 加入 SITE-NAV targets（P1-1）。
- **是否需要立即修改**：**是**，且应在**本轮第一次运行 inject_shared.py 之前**处理（改动仅在可写的 `_shared/inject_shared.py` 内，成本极低）。
- **证据**：`static-checks.txt D2 / D2b / inject_shared.py targets`；`inject_shared.py:24-34`。

---

## P2

### P2-8【实测复现】门户降级文案「打开对应页面后会自动出现」对任务台 / 明信片不成立
- **模块/位置**：`home.html:123`（foot 文案）；`home.html:208`（`m.total===null` 才尝试 fetch 兜底）。
- **当前表现**：清空三个业务键后，仅打开 `明信片追踪.html` → `wb_postcards_v1` 仍为 `null`；仅打开 `任务管理台.html` → `wb_taskhub_v1` 仍为 `null`；回到门户三项仍显示「—」。只有 `书影音海报墙.html` 启动时会写 `wb_mediawall_stats_v1`（实测 `total:1733`），文案只对海报墙成立（两页只在用户产生数据变更时才 `save()`）。
- **影响**：新用户按提示操作后数字不出现，误以为坏了。
- **具体修改建议**：改为「打开对应页面并产生/保存记录后会出现；若仍显示「—」说明本机尚未保存过数据」；或让门户在降级时给出更精确的说明。
- **是否需要立即修改**：否，但建议本轮顺手改（`home.html` 可写，纯文案）。
- **证据**：`browser-checks.txt [E7]` 三行结果；`明信片追踪.html:2222-2223`、任务台 `3591 saveQuiet`。

### P2-9【实测观察 + 静态推断】`file://` 下 `fetchMediaCount()` 兜底分支不可达（死代码）
- **模块/位置**：`home.html:193-201`。
- **当前表现**：清空 `wb_mediawall_stats_v1` 与 `wb_workbench_media_count_v1` 后打开门户，`mMediaAll` 正确降级为「—」，但 `wb_workbench_media_count_v1` 始终为 `null`——`fetch("书影音海报墙.html")` 在 `file://` 同源限制下失败，被 `.catch(function(){})` 静默吞掉。降级结果符合 B5，但这段兜底在「双击 HTML」这一主要使用方式下永远不会生效。
- **影响**：无用户可见故障；属预期外冗余路径，且会让维护者误以为门户能自行统计。正则 `\{"title":` 与 1731 条数据格式实测匹配（计数正确），但只数基线、不含自定义条目。
- **补充（主理人第 6 点）**：常规路径下门户「已记录」读的是 `wb_mediawall_stats_v1.total = MEDIA.length`（`书影音海报墙.html:3881`），实测 **1733 = 1731 基线 + 2 自定义**（其中 1 条是心愿），即**已包含** `wb_mediawall_custom_v1` 的条目；1731 只会出现在统计键与缓存键都缺失、且 fetch 成功的场景（`file://` 下实测不可达）。因此真正需要澄清的不是「计数漏了自定义」，而是卡片上「已记录 1733」与「自定义条目 2」并列展示时**未说明包含关系**，容易被读成两个独立总量（【静态推断】，非功能故障）。
- **具体修改建议**：删除该分支或改成「仅在 http(s) 下尝试」并加注释；或统一依赖媒体墙写入的 `wb_mediawall_stats_v1`；并在卡片文案上注明「已记录含自定义条目」（与 P2-12 的口径决策一并处理）。
- **是否需要立即修改**：否。
- **证据**：`browser-checks.txt [E7] home degrade`；`home.html:193-201`；`grep -o '{"title":' 书影音海报墙.html | wc -l` = 1731。

### P2-10【实测复现】心愿条目「标记为已完成」后不写完成日期，时间维度统计永久漏计
- **模块/位置**：`书影音海报墙.html:3244-3252`（`btnDone` 只 `delete en.status`，未补 `date`）；创建心愿时 `3402` 已 `delete entry.date`；依赖 `date` 的统计在 `2987`（完成年份分布）、`3029-3035`（月度节奏）、`3055-3060`（最近完成）、`2586`（recent 排序）。
- **当前表现**：心愿条目点击「✓ 标记为已完成（移出心愿单）」后，条目变成 `{title, type}`，`hasDate:false`；`renderStatsView()` 的「完成年份分布」不含该条（无 2026 新增）。
- **影响**：本轮新完成的记录不会出现在年份/月度/最近完成与「最近完成」排序中，统计低估。
- **具体修改建议**：`btnDone` 中补 `en.date = <今日 YYYY-MM>`（与表单 `fDate` 同格式），再 `saveCustom()`。
- **是否需要立即修改**：**需主理人授权**（业务逻辑）。
- **证据**：`browser-checks.txt [E4]` `{"btnShown":true,"entryAfter":{"title":"心愿测试条目","type":"书本"},"hasDate":false}`。

### P2-11【实测复现】「心愿单排除统计」不完整：题材偏好 TOP14 混入心愿条目
- **模块/位置**：`书影音海报墙.html:3004-3010` `genreCnt` 遍历 `MEDIA` 未过滤 `isWish`；`2987` `yearCnt` 同样未过滤（心愿通常无 `date`，当前不显现）；`3076` `累计记录` 用 `MEDIA.length`（含心愿）、`3073` 已看卡 hint 用 `MEDIA.filter(type==="动漫").length` 未过滤。对照已正确排除的位置：`2602`、`2879`、`2924`、`2972-2978`、`3020`、`3029`。
- **当前表现**：受控数据 1 条已完成（题材「科幻」）+ 1 条心愿（题材「测试题材」）→「题材偏好 TOP 14」显示 `科幻 1 / 测试题材 1`，而已读卡为 1、心愿单卡为 1。
- **影响**：题材画像被「想看/想读/想听」污染，与「已完成口径排除心愿」的既定规则不一致。
- **具体修改建议**：`genreCnt` 与 `yearCnt` 的遍历加 `!isWish(i)`；`累计记录`/hint 的口径请主理人一并明确（见下条）。
- **是否需要立即修改**：**需主理人授权**。
- **证据**：`browser-checks.txt [E5]` `{"genreSection":"题材偏好 TOP 14…科幻 1测试题材 1","wishGenreListed":true}`。

### P2-12【实测观察 / 口径待明确】「累计记录 / 已记录」含心愿单，与「心愿单不计入统计」表述有歧义
- **模块/位置**：`书影音海报墙.html:3881`（`wb_mediawall_stats_v1.total = MEDIA.length`）、`3076`（累计记录卡）、`home.html:184-192`（门户「已记录」直接读该 total）。
- **当前表现**：注入 2 条自定义（1 心愿 + 1 已完成）后打开海报墙，`MEDIA.length=1733`、`wishCount=1`、`wb_mediawall_stats_v1.total=1733`；分析页「累计记录 1733」，已看+已读+已听 = 1732，另有「⭐ 心愿单 1」卡。门户「已记录」同步显示 1733。
- **影响**：数字本身自洽（累计 = 已完成 + 心愿），但 brief 要求「心愿单排除口径（统计、画像、平均分）」，「累计记录」是否属于「统计」需定义。若定义为排除，则门户与三处卡片都要改；若定义为「全部记录」，则应在卡片/文案上写明含心愿单，避免歧义。
- **具体修改建议**：主理人给出唯一口径后统一三处（媒体墙累计卡、stats 写入、门户标签）；不要只改其中一处。
- **是否需要立即修改**：否（先决策）。
- **证据**：`browser-checks.txt [E2]`；`书影音海报墙.html:3881,3076`；`mediawall-390.png`（可见 995+346+391+1=1733）。

### P2-13【实测复现】`书影音海报墙.html` 在 390px 窄屏横向溢出，视图切换按钮被裁
- **模块/位置**：`书影音海报墙.html:239-250`（`.topbar/.toolbar`）、`300-315`（≤560px `.toolbar{flex-wrap:nowrap}`）、`92`（`.viewtabs{flex:none}`）、`560-575`（toolbar HTML：搜索框 + 新增 + 导出 + 导入 + 两个视图 tab 全部同一行）。
- **当前表现**：390px 实测 `document.documentElement.scrollWidth=471 > innerWidth=390`（密度模式 508）；`.viewtabs` `right=471`，`📊 汇总分析` 被裁到屏外，`＋ 新增条目` 也被压窄；截图可见底部横向滚动条。1440/1024/768/560px 均无溢出，故为 ≤约 500px 的窄屏问题。`home.html` 390px 无溢出且单列 ✓。
- **影响**：390px 手机上无法直接点到「汇总分析」，整页可横向拖动；C2 要求不破坏海报墙功能，B6 虽只约束门户但该问题影响真实移动端可用性。
- **具体修改建议**：≤560px 让 `.toolbar` 允许换行，或把导出/导入/视图切换挤到第二行（或收进菜单）；至少给 `.viewtabs` 保留可见宽度并给 `body`/`html` 加 `overflow-x:hidden` 兜底。属容器/视觉 CSS，可能落在开发者授权内，请主理人确认。
- **是否需要立即修改**：建议本轮一并修（若在授权范围内）；否则列入下轮。
- **证据**：`browser-checks.txt [E8]`；`mediawall-390.png`；`static-checks.txt`（390px 逐页溢出表见会话记录）。

### P2-14【实测观察 + 静态推断】任务台 / `index.html` 存在两个 manifest link 与重复 SW 注册，与「统一 PWA 一个 App」不一致
- **模块/位置**：`任务管理台.html:9`（静态 `<link rel="manifest" href="manifest.json">`，统一「工作台」、`start_url=./home.html`、3 shortcuts）与 `12568-12576`（运行时 `injectManifest()` 追加 `data:application/manifest+json,...`，name「任务管理台」、`start_url:"."`、内联 SVG 图标）；`3296-3301`（SITE-NAV `registerSW`）与 `12648`（遗留 `register("sw.js")`）各注册一次。`index.html` 为逐字节副本，同样存在。
- **当前表现**：实测 `任务管理台.html` / `index.html` 的 `link[rel=manifest]` 数量为 **2**，其余三页为 1。规范浏览器按 tree order 取第一个（即 `manifest.json`），故**未复现功能故障**；但运行时那份 `start_url:"."` 指向 `index.html`（任务台），与统一形态冲突，且 CSP 下 `data:` manifest 可能被拦。两次 `register("sw.js")` 按规范幂等，file:// 下两者都跳过，实测无 JS 报错。
- **影响**：工程一致性/潜在兼容风险；旧安装用户可能仍拿到「任务管理台」名与旧 start_url。
- **具体修改建议**：清理 `injectManifest()` 与遗留注册块，只保留静态 `manifest.json` + SITE-NAV 的 `registerSW()`。
- **是否需要立即修改**：否（但需主理人确认，因为 `任务管理台.html` 不在开发者可写路径）。
- **证据**：`browser-checks.txt [E6]` `index.html … "manifests":2`；`任务管理台.html:9,12568-12576,12648`。

### P2-15【静态推断】`sw.js` 预缓存清单未含 `manifest.json` / `icon-512.png` / `icon-180.png`，离线兜底只覆盖页面
- **模块/位置**：`sw.js:8` `PRECACHE=["./", "./home.html", 三页, "./icons/icon-192.png"]`；`sw.js:83-91`（navigate 失败回 `./home.html`，非导航请求离线直接 `Response.error()`）；`manifest.json:12-25` 引用 192/512 图标，各页还有 apple-touch-icon 180。
- **当前表现**：`manifest.json` 与 512/180 图标不在预缓存内，且 fetch 策略为「网络优先、不写运行时缓存」。离线时这些非导航请求不会命中缓存。
- **影响**：离线/弱网下 PWA 重装、桌面图标、启动画面可能拿不到资源（**未实测**：需 https 环境，本轮为 file://）。导航兜底本身会把任意页面失败回退到门户首页，属设计行为。
- **具体修改建议**：把 `manifest.json`、`icons/icon-512.png`、`icons/icon-180.png` 加入 PRECACHE；或把非导航资源也做 stale-while-revalidate。
- **是否需要立即修改**：否。
- **证据**：`sw.js:8,83-91`；`manifest.json:12-25,26-30`；`static-checks.txt D1b`（两个 manifest JSON 合法、`sw.js node --check` 通过）。

### P2-16【实测复现 / 已升级】门户私有主题键优先导致「三页→门户」主题不同步
- **模块/位置**：`home.html:130`（`THEME_KEY="wb_workbench_theme"`）、`143-147`（`initTheme` 读 `wb_workbench_theme || wb_theme_v1`）、`149-153`（切换时两个键都写）；`任务管理台.html:4,12422,9665,12607`（读 `wb_theme_v1 || wb_taskhub_theme_v1`，只写 `wb_theme_v1`）；`明信片追踪.html:4,4184,5398`（读 `wb_theme_v1 || wb_postcards_theme`，两键都写）；`书影音海报墙.html:10,3863-3873`（只读写 `wb_theme_v1`）。
- **当前表现（真实浏览器复现）**：门户点「切换主题」→ `dark`，两键均 `dark`；随后在明信片页点「切换主题」→ `light`，`wb_theme_v1=light`、`wb_postcards_theme=light`，但 `wb_workbench_theme` 仍为 `dark`；此时同一 storage 下四页为：**home.html = dark**，任务台/明信片/海报墙 **全为 light**。
- **方向修正**：门户切换会同时写 `wb_theme_v1`，故**「门户→三页」是同步的**；不同步只发生在**「三页→门户」**（且前提是门户曾切过主题、留下私有键）。门户是四页中唯一「私有键优先于共享键」的页面，属不对称设计。
- **影响**：用户在一个页面切了主题，回到门户看到相反主题，与「同一工作台」预期冲突；B4 只要求「切换主题、暗色模式工作正常」，未明确要求跨页同步，故仍列 P2，但不再是「纯取舍」而是可复现的状态不一致。
- **具体修改建议**：去掉 `wb_workbench_theme` 的优先级（改为只读 `wb_theme_v1`，或让私有键仅在用户显式选择「本页独立主题」时生效）；或给三页也写门户私有键。若保留，需在 UI 上说明「门户主题独立」。
- **是否需要立即修改**：否，需主理人确认（D-7）；但需在 test-plan §2.4 加跨页一致性断言。
- **证据**：`supplement-checks.txt [S1][S2]`（完整逐步输出）；`home.html:130,143-153`；`明信片追踪.html:4182-4184`。（任务台 `#btnTheme` 点击在本次未触发切换，故用明信片页的显式 `onclick` 复现；任务台按钮绑定路径未细查。）

### P2-17【实测观察】`manifest-postcard.json` 已保留但无任何页面引用
- **模块/位置**：`manifest-postcard.json`（name「明信片追踪」、`start_url=./明信片追踪.html`）；全仓库 `*.html` 中无 `manifest-postcard` 引用，四页 + `index.html` 均指向 `manifest.json`。
- **当前表现**：文件仍在、JSON 合法，符合 brief「兼容保留」要求。
- **影响**：仅为兼容遗留；若线上旧 PWA 仍指向它，需确保部署时保留该文件。
- **具体修改建议**：保留，不删除；在交付说明中注明「兼容文件，无页面引用」。
- **是否需要立即修改**：否。
- **证据**：`static-checks.txt D1b / PWA references`；Grep 全仓 `manifest-postcard` 无命中。

### P2-18【静态推断】海报墙存在两套 `:root` token 源，`--ink-soft` / `--shadow-hover` 为页面私有且不在共享规范内
- **模块/位置**：`书影音海报墙.html:13-24`（私有 `:root`：`--bg:#F8FAFC`、`--ink:#1f2328`、`--ink-soft:#57606a`、`--line:#e6e9ef`、`--shadow-hover:...`）、`:419`（暗色私有块含 `--ink-soft:#9aa3b2`）、`:511-540`（`SHARED TOKENS START/END` 内第二个 `:root` 覆盖 `--bg:#f5f7fb` / `--ink:#1f2430` / `--line:#e7ebf2`）；`/Users/chenhuiying/Documents/Obsidian Vault/_ops/_workbench/design_tokens.css`（无 `--ink-soft`、无 `--shadow-hover`）。
- **当前表现**：`git show HEAD:书影音海报墙.html` 实测 `:root{` 出现 2 次、`SHARED TOKENS START` 1 次；后者位于文件后部并覆盖同名变量，`body` 背景实测已是 `#f5f7fb`（与主理人量测一致），**当前未见渲染故障**。`--ink-soft` / `--shadow-hover` 只存在于私有块，不在 `design_tokens.css` 规范 token 内。
- **补充（措辞收紧，已按基线复核）**：「页面私有」按**分别保留**理解，不表示 home 与海报墙两页各含这两个变量——`git show HEAD:home.html` 实测私有 `:root` 只有 `--shadow-hover`（`:16` 亮 / `:21` 暗）、**无 `--ink-soft`**，home 文字色全程用 `--sub`（`:13,19`）；`--ink-soft` 仅存在于 `书影音海报墙.html:17`（亮）/`:419`（暗）；`--shadow-hover` 在两页各有私有定义（`home.html:16,21`、`书影音海报墙.html:25`）。`design_tokens.css` grep 确认两者均不在共享规范内。结论不变，仅避免把「私有」误读为两页共有。
- **影响**：双源维护隐患——后续若有人只改私有块里的 `--bg/--ink/--line`，会被标记区静默覆盖；若 `sync_tokens.js` 或人工整理把私有块删掉，依赖 `--ink-soft`（`.chip`、`.vtab`、`.s-m` 等文字色）、`--shadow-hover` 的组件会退化且**无 JS 报错**。
- **具体修改建议**：把私有 token 明确置于 `SHARED TOKENS END` **之后**并注释「页面私有」；同名变量只保留一份；`--ink-soft` / `--shadow-hover` 或补进 `design_tokens.css`（需主理人改共享源），或明确保留为页面私有。
- **是否需要立即修改**：否（当前无故障），但实现后须按 `test-plan.md` §2.4/§2.6 验证 hover 阴影与文字色在亮/暗下仍生效。
- **证据**：`supplement-checks.txt [S4][S6]`；`design_tokens.css` grep 无 `--ink-soft` / `--shadow-hover`。

### P2-19【静态推断 / 工程健壮性】`inject_shared.py` 找不到标记块时静默 `return False`，注入命令仍以退出码 0 结束
- **模块/位置**：`_shared/inject_shared.py:45-47` `if not pat.search(s): print("  未找到标记块，跳过:", ...); return False`；`main()`（`:54-65`）不检查 `inject()` 返回值、不 `sys.exit(1)`。
- **当前表现**：若只把 `home.html` 加入 SITE-NAV targets 却忘记在页面内加 `SITE-NAV:BEGIN/END` 标记块，脚本只打印一行「未找到标记块，跳过」，整体退出码 0，看起来「注入成功」；导航条不会出现，且**没有任何 JS 报错**。这与 P1-1 的实现方式直接相关，是最容易漏检的失败模式。
- **影响**：本轮核心项 B1 可能「看似做完、实际没生效」，且静态断言（标记块存在）与浏览器 DOM 断言（`__wsn_bar` 存在）都能更早发现。
- **具体修改建议**：`main()` 收集失败并返回非零退出码（或至少在摘要里打印 `FAILED` 列表）；更稳妥的是在注入后强制跑一次「每页都必须含标记块」的断言。
- **是否需要立即修改**：否，但**必须**在 `test-plan.md` §1.3 / §2.1 用显式断言兜住（不能只看 inject 输出）。
- **证据**：`supplement-checks.txt [S7]`；`inject_shared.py:41-51,54-65`。

---

## 已确认无明显问题的部分

**工程回归（当前基线）**
- D1：五个 HTML 共 11 个非空 `<script>` 块 `node --check` 全通过；`sw.js` `node --check` 通过；`manifest.json`、`manifest-postcard.json` 均合法 JSON。
- D2：三页 SITE-NAV 内联块、两页 SHARED 内联块与 `_shared/*.js` **逐字节 MATCH**；`index.html` 的两块同样 MATCH；`shared.js` **未**注入 `书影音海报墙.html` 与 `home.html`（符合铁律 1）；`index.html` 与 `任务管理台.html` 逐字节一致；克隆与 vault 四页均逐字节一致。
- D3：`node sync_tokens.js --check` 三页 IN_SYNC（注意它检查的是 **vault** 副本，不是克隆；两者当前一致）。
- D4：`node /tmp/harness.js` **52/52**；`node /tmp/verify_partial.js` 通过（翻页只重渲染 `sec-seen`，未动组零重建）。

**站点导航**
- `_shared/site-nav.js:20-29` `currentPage()`：`index.html`→`tasks`、`home.html`→`home`、三页各自正确；实测 `index.html` 高亮「任务台」、`任务管理台.html`「任务台」、`明信片追踪.html`「明信片」、`书影音海报墙.html`「海报墙」，均带 `aria-current="page"`。
- 导航链接**无** `target="_blank"`，同标签跳转实测通过（点击「首页」后 URL=`.../home.html`、标签页仍为 1）。全仓 `target="_blank"` 共 9 处均为用户内容外链（卡片链接、活动链接、书签、`rel="noopener"`），属合理使用，非导航残留。
- SW 守卫：`site-nav.js:72-78` 与 `home.html:220-222` 在 `file://` 下均跳过注册；五页 `agent-browser errors` 全空、无 JS 报错。重复 `register("sw.js")` 按规范幂等。

**海报墙业务逻辑（已验证部分）**
- 排序：`2585-2592` 四种比较器均带 `a.i-b.i` / `k` 原始序号兜底，稳定；排序记忆写 `wb_mediawall_sort_v1`；筛选/搜索/分页联动由 harness + `verify_partial.js` 覆盖。
- 心愿单：统计/画像/评分/类型/月度均正确排除 `status:"wish"`（`2602,2879,2924,2972-2978,3020,3029`）；`avg()` 正确过滤无评分条目（`2975`，fix 后不再 NaN）。
- XSS：`esc()`、`hiLite()`（先切片后逐段转义）、`stars()` 覆盖 title / creator / genre / year / platform / poster / 感想 / 搜索词 / toast；`openDetail`、`pcard`、搜索下拉均未见未转义的用户字段插值。
- 感想脏检查：`3174` 记录 `dataset.orig`、`3260+ tryCloseDetail()` 比对后弹确认；harness「M-2 感想编辑脏检查」3 项通过。
- hash 保态与回放：`syncHash()` 用 `history.replaceState`（实测 `file://` 下可用）、`applyHash()` + `hashchange` 回放；实测点选「书本」得 `#f=%E4%B9%A6%E6%9C%AC`，手动置 `#v=stats` 正确切到分析页。
- 交互实测：`.pcard` Enter 打开详情、Esc 关闭；←/→ 弹窗导航与跨页翻页（harness）；密度切换写入 `wb_mediawall_dense_v1`；自动翻页哨兵已注册（3 个 `.gp-sentinel`，`_autoIO` 存在）——**触发效果未能在本环境验证，见下节**。

**门户页（已验证部分）**
- 四个 localStorage 键读取与三页写入**结构一致**：`wb_taskhub_v1` = 任务数组（`任务管理台.html:3591` `JSON.stringify(state.tasks)`）；`wb_postcards_v1` = 对象 `{postcards, received, proxies, activities, ...}`（`明信片追踪.html:2222`）；`wb_mediawall_stats_v1` = `{total, ts}` 且 total 为 `MEDIA.length`（`书影音海报墙.html:3881`）；`wb_mediawall_custom_v1` = 数组。**未发现把数组/对象结构猜错导致数字错误**。
- 读不到时降级「—」并带 `.dim` 样式，`mMediaAll` 在键缺失时实测为「—」，符合 B5；门户不写任何业务数据（只写主题键与缓存键）。
- 三张入口卡、刷新摘要、切换主题、数据说明均在工作；390px 单列无横向溢出；Tab 可聚焦、`:focus-visible` 生效（卡片/按钮有 2px outline，快捷跳转链接依赖 UA 默认 outline）；`prefers-reduced-motion` 实测 `cardTransition:0s`。
- PWA：`manifest.json` `start_url=./home.html`、`scope=./`、3 个 shortcuts 分别指向三页、icons 齐全；`sw.js` 预缓存含 `./`、门户 + 三页 + icon-192，离线导航兜底回门户。

---

## 未验证项 / 环境限制

1. **自动翻页哨兵的实际续页**：滚动到哨兵附近（`scrollY≈2685`，哨兵 `top=3085`，处于 600px rootMargin 内）后 `page`/`_autoCount` 不变；另建一个**独立对照 IntersectionObserver** 同样收不到任何回调，判定为当前无头 Chromium 不派发 IO 回调的**环境限制**，**不计为缺陷**，需在真实可见浏览器复验。
2. **https 部署下的 PWA**：SW 注册/安装、离线兜底、`manifest.json` 与 512/180 图标离线可用性，均未在 https 环境实测（本轮为 `file://`）。P2-15 为静态推断。
3. **GitHub Gist 云同步**与多端合并、冲突处理路径未测。
4. **真实用户全量数据下的摘要数字**：用合成数据完整复现了口径问题；默认会话中真实数据 `今日完成=0`（无历史完成样本），未覆盖全部组合。
5. **跨浏览器 / 真机**：仅 Chromium（agent-browser 0.27.0），未测 Safari/Firefox；390px 为桌面浏览器视口模拟，非真机触控。
6. **1024/768px 暗色全量对比度**：仅做了 1440 亮/暗的门户对比度与 1440→390 的溢出扫描；B6 的 1024/768 亮色布局未在真实浏览器逐项量测（brief 已由主理人在 1440 量测）。
7. **键盘 ↑↓ 搜索下拉逐键操作**：harness 覆盖搜索相关项，但未在真实浏览器逐键复现 ↑↓/Enter 选择。
8. **本轮实现后的最终版本**：以上全部为**实现前**基线（commit `87d8ba6`）。开发完成后须按 `qa/test-plan.md` 重跑，本清单不能当作最终版本的验收结论。

---

## 需主理人决策的事项（QA 不自行扩大范围）

| # | 事项 | 冲突点 | 建议 |
|---|---|---|---|
| D-1 | P1-4 / P1-5 / P1-6 / P2-10 / P2-11 是否修复 | brief 铁律 5「不得改动业务逻辑/数据结构/localStorage 键」，且 `任务管理台.html`、`明信片追踪.html` 不在开发者可写路径；`书影音海报墙.html` 仅允许容器/视觉 CSS | 二选一：① 明确授权本轮修业务逻辑并扩大写入路径；② 只改文案/标签使名实相符，数字偏差列入已知限制并写入交付说明。请给出唯一口径 |
| D-2 | P1-2 把 `home.html` 纳入 token 同步体系 | `sync_tokens.js` / `design_tokens.css` 在 vault `_ops/_workbench/`，status.md 规定由主理人同步 vault | 主理人负责改 TARGETS 并同步 vault 副本；开发者只改克隆里的 `home.html` 标记区 |
| D-3 | P1-7 `index.html` 注入目标缺失 | 若本轮不改 `site-nav.js`/`shared.js` 内容，风险不触发；一旦改动就会破坏铁律 3 | 建议在 `inject_shared.py` 内一并覆盖 `index.html`（可写、低成本），并在注入后强制跑 `cmp` |
| D-4 | P2-12「累计记录/已记录」是否含心愿单 | 与 brief「心愿单排除统计」表述存在歧义 | 给出唯一口径，统一媒体墙累计卡、`wb_mediawall_stats_v1` 写入、门户「已记录」三处 |
| D-5 | P2-13 390px 海报墙溢出是否在授权内 | status.md 限定开发者对海报墙只能改「容器/视觉 CSS」；toolbar 换行属于布局 CSS | 确认是否允许一并修；若否，列入下轮 |
| D-6 | P2-14 清理任务台运行时 manifest / 重复 SW 注册 | `任务管理台.html` 不在开发者可写路径 | 由主理人决定是否改；当前规范浏览器未见功能故障 |
| D-7 | P2-16 门户主题是否保留「本页单独覆盖」（**已实测复现**三页→门户不同步） | 与「同一工作台」预期冲突；B4 未明确要求跨页同步 | 确认取舍；若要求一致，去掉私有键优先级，并在 test-plan §2.4 加跨页断言 |
| D-8 | P2-18 海报墙双 `:root` / `--ink-soft` 私有 token 是否整理 | 需改 `书影音海报墙.html` 或共享 `design_tokens.css`（后者在 vault） | 当前无故障，建议仅加注释隔离私有 token；实现后按 test-plan 验 hover 阴影与文字色 |

---

## 复查建议（开发完成后）

只按 `qa/test-plan.md` 重跑受影响路径，重点：① 门户导航条/首页高亮；② token 对齐与暗色 `.go` 对比度 ≥4.5；③ 注入后 `index.html` 仍与 `任务管理台.html` 一致；④ 52 项 harness 与 `verify_partial.js` 不回退；⑤ 390px 与暗色无新增溢出/报错。业务逻辑类问题在被授权修复前，按上表 D-1 的结论记录为「已知限制」而非通过。
