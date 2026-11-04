# QA 独立复核 · 改后最终快照（recheck）

**结论**：**改后版本**核心验收条件全部达成，**无 P0 / P1 残留**。主理人报告「全绿」经独立复核基本成立；本次另发现 **1 项 P2 边缘对比度未达标**（`ov-cell` 小字亮色 4.471 < 4.5）、**2 处描述/建议值差异**（私有 token 位置、断点列数），均**不阻塞交付**。建议按已验证范围交付，并把 P2 与挂账项写入交付说明。

> **补记（主理人催办）**：本报告已于 2026-11-04 20:24 落盘（231 行）并回传；主理人 20:2x 的催办消息标记「`recheck.md` 不存在、PENDING」，应为消息在我回传前入队所致，非文件缺失。收到催办后，我按其中列出的 6 项重新做了**第二轮独立补充复核**（左边界对齐、URL hash 越界、无 localStorage / 空数据集、评分归一无 NaN、容器 1360px），结论仍为全 PASS、无新增 P0/P1，详见 **附录 A**。第二轮**只写了 `qa/recheck.md` 这一个文件**，未新建任何证据文件、未修改应用源码或用户报告；命令输出以代码块内嵌在本文件内作为可复现证据。

---

## 0 复核对象与边界

| 项 | 内容 |
|---|---|
| **版本性质** | **改后最终快照**（不是实现前基线 `87d8ba6`），主理人宣布源码已冻结、应用写入已暂停后执行 |
| **复核时间** | 第一轮 2026-11-04 20:07–20:22；第二轮（催办补充）20:2x（全部证据均晚于源码冻结；冻结 MD5 在第二轮开工前再次复核，未变） |
| **版本标识 MD5（实测，与派发清单逐字一致）** | `home.html f7e83df10fc5c48b3a4dff908a31cbf3`<br>`任务管理台.html 81d7ee5b429bd10b0a04fd6e651961f6`<br>`index.html 81d7ee5b429bd10b0a04fd6e651961f6`<br>`明信片追踪.html 0e09e7096edbec3d522160ec470c54f0`<br>`书影音海报墙.html d2b30b8c821fbaa94a8f36f8bcc66c74` |
| **MD5 复核时点** | 开工前（`recheck-static.txt [R1]`）+ 全部检查结束后（`recheck-registered-items.txt [H7]`）两次一致 |
| **方法** | 源码静态只读 + 真实 Chromium（`agent-browser 0.27.0`，`file://` 双击场景）+ 既有回归桩；依 `qa/test-plan.md` 缩小范围执行 |
| **会话隔离** | 独立会话 `qarecheck` / `qaclean` / `qadiag` / `qageom` / `qashot` / `qatz`；合成数据只写这些会话的 localStorage，**未写用户真实 localStorage**；结束时全部 `close` |
| **只读保证** | **未修改任何应用源码**。会写源码的 `inject_shared.py` / `sync_tokens.js`（非 `--check`）只在 `/tmp/qa-recheck-sandbox` 的**副本**上运行；真实仓库 `git status` 始终只有 `M` 三文件（开发者改动）+ `?? deliverables/`（QA 产物），无 QA 新增改动 |
| **证据目录** | `/tmp/toolsrepo2/deliverables/site-ui-review-1104/qa/evidence/recheck/`（24 个 `recheck-*` 文件，含 4 张截图） |

> **不直接采信主运行结果**：以下每条结论都来自本成员独立执行的命令或浏览器断言；主理人「全绿」仅作为对照，未作为通过依据。

---

## 1 逐条 PASS / FAIL（按派发「重点验证」6 组）

### ✅ 组 1 · 390×844 四页无横向溢出、海报墙 `#vStats` 与搜索框可见 — **PASS**

`recheck-browser-responsive.txt [B17][B18][B19]`，16 组（4 宽度 × 4 页）实测：

| 宽度 | home | 任务台 | 明信片 | 海报墙 |
|---|---|---|---|---|
| 1440 | `docW=1440` | `1425` | `1440` | `1425` |
| 1024 | `1024` | `1009` | `1024` | `1009` |
| 768 | `753` | `753` | `768` | `753` |
| 390 | `375` | `375` | `375` | `375` |

- 16/16 组 `overflow:false`（`docW <= innerW`）。`docW` 比 `innerW` 少 15px 是垂直滚动条占位（`clientW` 实测 1425/1009/753/375），**不是内容溢出**（`recheck-browser-nav.txt [B6]` 已验证 `scrollbar=15`）。
- **实现前基线缺陷 P2-13（海报墙 390px `docW=471`）已修复**：现 390px `docW=375`。
- 390×844 海报墙几何（`[B18]`）：`.viewtabs` `{l:18,r:357,w:339}` 独占一行且居中、`#searchBox` `{l:18,r:106,vis:true}` 可见、`#btnAdd` 可见、**`#vStats {l:185,r:281,w:95,vis:true}` 完整落在视口内**（基线为 `left=376` 溢出）。`.wrap {l:0,r:375}` 无溢出。
- 门户 390px：`gridCols:1`（单列，B6 要求）、`ovCols:2`、`.ov-note` 未超出视口。
- 对应改动清单第 3 条（`@media(max-width:560px)` 加 `.toolbar{flex-wrap:wrap;row-gap:8px}` + `.viewtabs{order:3;width:100%;justify-content:center}`）**已生效**，见 `recheck-final-static.txt [B30]` 前后对比与暗色截图。

### ✅ 组 2 · 门户「今日完成」=2、明信片「在途 2 / 已到 2」 — **PASS**

`recheck-browser-summary.txt [B7]` 用 test-plan §2.2 的 5 条任务 + 明信片 fixtures：

```
mTaskOpen=1  mTaskDone=2  mTaskAll=5
mPcTransit=2 mPcArrived=2 mPcAll=7
mMediaAll=1731 mMediaCustom=2   ovTotal=1743 ovTask=5 ovPc=7 ovMedia=1731
```

- `summaryTasks()`（`home.html:238-256`）已复刻任务台 `doneOnDate`：非重复任务看 `doneAt[今日]`/`doneAt.self`、重复任务看 `doneDates` 含今日；2020 年历史完成任务不再计入 → **2**（实现前基线为 3）。
- `summaryPostcards()`（`home.html:260-271`）：在途 = `postcards.transit + received.transit` = **2**；已到/已收 = `postcards.arrived + received.received` = **2**（实现前基线 1/3）。`mPcArrived` 标签已改「已到 / 已收」，与口径一致。
- **补充边界复核（避免 fixture 巧合通过）**：`doneAtIsoFor()`（`任务管理台.html:4745-4748`）写的是**本地** `YYYY-MM-DDTHH:MM`，门户 `slice(0,10)` 与本地 `today()` 同口径；我原 fixture 用 `new Date().toISOString()`（UTC），在本机 UTC+8 且当前 12:19Z 时 UTC 日期与本地日期恰好同为 11-04，属巧合。已用**真实写入格式** `2026-11-04T20:20` 重测（`recheck-timezone-inject.txt [B38]`）→ 仍为 `mTaskDone=2`；并补测「重复任务 `doneAt[今日]` 显式补打卡 + 一次性任务」组合 → `done=2 / open=0 / all=2`（`[B39]`）。**结论稳固**。
- 标签/降级边界（`[B8][B9][B10]`）：缺键时 12 项全「—」、`dim=8`；结构损坏（对象/数组/字符串 total）时全「—」且 `errors` 为空；`#btnRefresh` 后数值不丢。干净会话 `qaclean` 前后 `wb_` 键均为 `[]` → **门户「只读不写」成立**（`recheck-readonly.txt [B11]`），未新增业务键（`[R9]` 基线/改后 `wb_` 键集合逐字相同）。

### ✅ 组 3 · 分析页平均评分 =8.5、TOP12 按归一值排序 — **PASS**

`recheck-browser-mediawall2.txt [B13']`，受控数据 `(rating:9 十分制, rating:4 五分制)`：

```
avgCard = "平均评分 8.5 / 2 条有评分（5 星制已换算为 10 分制）"
dist    = "9-10 分 1 | 8-9 分 1 | 7-8 分 0 | 6-7 分 0 | 6 分以下 0"
TOP12   = [{"t":"十分制条目","sc":"9"},{"t":"五分制条目","sc":"8"}]
```

- `avg`（`:2978`）、`avgV`（`:2928`）、评分分布（`:3022`）、`r10`/TOP12（`:3045-3051`）四处统一 `i.rating>5?i.rating:i.rating*2`，实现前基线自相矛盾（平均 6.5 vs 分布按 10 分制）**已修复**；4 分条目正确落入「8-9 分」桶并显示为 8。
- 平均评分卡文案已改「5 星制已换算为 10 分制」。

> ⚠ **测试方法说明（非应用缺陷）**：首轮 `[B13][B14]` 在无显式 `wait` 时于页面脚本完成初始化前执行，抛 `ReferenceError: Cannot access '_profEntries' before initialization`（TDZ）并出现 `sortSel:null`。另开干净会话 `qadiag` 诊断（`recheck-diag.txt [D1]`）：`readyState=complete`、`bodylen=556334`、10 个关键 DOM 全存在、`errors` 与 `console` 均空；加 `wait 800ms` 后全部通过。**判定为测试时序 artifact，不计缺陷**。

### ✅ 组 4 · 导航条 / 高亮 / 注入一致性 / 副本 / token 检查 / inject 非零退出 — **PASS**

- **五页导航条真实 DOM**（`recheck-browser-nav.txt [B1]`）：5/5 `nav:true`（`__wsn_bar` 真的渲染，不只是 inject 输出）；高亮 `home→["首页"]`、`index/任务台→["任务台"]`、`明信片→["明信片"]`、`海报墙→["海报墙"]`，`on` 与 `cur`（aria-current）一致；`blank:0`；`hrefs` 恰为 4 个相对链接；`position:relative` 不遮挡。
- **全宽几何**（`[B2][B6]`）：`navLeft=0`、`bodyPadLeft=0px`、`barOverflow:false` 四个宽度全通过；`navRight=docClientW`（1440/1024/768/390 = 1440/1024/753/375），768/390 少的 15px 是滚动条，`navFullWidth:true` 已复核 → 基线 `body{padding:28px 20px}` 内缩问题**已修复**。768px 下 `.__wsn_hint` 仍显示（≤680 隐藏规则）且不撑破页面，符合 ui-designer 提醒。
- **同标签跳转**（`[B3]`）：明信片 → 点首页链接 → `location.href=file:///tmp/toolsrepo2/home.html`、`tab list` 仍 1 个标签。
- **注入一致性**（`recheck-inject-consistency.txt [R16]`）：10/10 项 `OK`，`RESULT: PASS`。SITE-NAV 覆盖 5 页（含 `home.html`/`index.html`）、SHARED 仅任务台/明信片/`index.html`（海报墙与门户 `present=0`），且内联块与 `_shared/*.js` **逐字节一致**。`shared.js` 未注入海报墙/门户（铁律 1，`[R4]`）。
- **`index.html ≡ 任务管理台.html`**：真实仓库 `IDENTICAL`（`[R5]`）；**沙盒运行过 inject 之后仍 `IDENTICAL`**（`recheck-timezone-inject.txt [B40]`）→ D2/铁律 3 稳固。
- **`sync_tokens.js --check`**：退出码 0，**4 行 IN_SYNC 含 home.html**（`recheck-vault-tokens.txt [R17]`）；`TARGETS` 4 页（`recheck-tools-sw.txt [H8]`）。克隆与 vault `Projects/` 四页 `cmp` 全 `IDENTICAL`；`design_tokens.css` 标记区四页 `markers=1`、`--radius:12px`、`font-size:15px` 全对齐 → **B3 达成，16px 漂移已移除**。
- **`inject_shared.py` 缺标记块非零退出**：沙盒副本双跑（`recheck-silent-failure.txt [R22]`）：A 全标记块齐全 → `exit=0`、8 行「已同步」；B 删掉 `home.html` 的 SITE-NAV 标记块 → 打印「未找到标记块，跳过」+「注入失败（缺标记块）」→ **`exit=1`**。**P2-19 静默失效已修复**。
- **`sync_tokens.js --check` NO_MARKERS**：沙盒副本双跑（`[R23]`）：C 四页齐全 → 4×IN_SYNC `exit=0`；D 删掉 vault `home.html` 的 SHARED TOKENS 区 → `[MISSING] home.html (NO_MARKERS)` → **`exit=1`**。源码 `sync_tokens.js:65-73` 的 `anyChange || missing` 逻辑已确认。
- **共享工具 vault 副本**（`[H8]`）：`/Users/.../_ops/_workbench/inject_shared.py` 与仓库 `_shared/inject_shared.py` `IDENTICAL`（targets 已补 `index.html`/`home.html`、`sys.exit(1)` 已同步）→ 改动清单第 5 条成立。
- 上述沙盒测试后真实仓库 5 个 MD5 全部未变（`[R24]`）。

### ✅ 组 5 · 门户亮/暗主题、图标底色、`.go` 对比度、概览卡与降级文案 — **PASS（含 1 项 P2 边缘）**

- **`.go` 暗色对比度**（`recheck-browser-theme2.txt [B22']`）：实现前基线 3.59 → **暗色 7.94**、亮色 5.48，均 ≥4.5 → **P1-3 已修复**。其余文字暗色 `desc 6.67 / h2 14.2 / btn 14.2 / nav 4.73 / ovk 6.2`；亮色 `desc 4.83 / h2 15.52 / nav 4.73`。
- **图标底色**（`[B22'][B23']`）：亮色 `icoTaskBg #eaf0ff`（柔和浅蓝），暗色 `#1c2740`；图标前景暗色 `.ico-tasks 6.95 / .ico-pcards 7.12 / .ico-media 6.53`（亮色 4.15/3.41/3.61 为**装饰性图标字形**，非正文，且属三页原有分类色语言，未列为问题）。「不再刺眼」达成。
- **私有 token 未静默丢失**（`[B23']`）：`--shadow-hover` 亮 `0 6px 22px rgba(31,36,48,.12)` / 暗 `0 6px 22px rgba(0,0,0,.45)` 均生效且不同值，`.card:hover` `boxShadow` 非 `none`；海报墙 `--ink-soft` 亮 `#57606a` / 暗 `#9aa3b2` 均非空，`.chip` 有颜色；`bodyBg` 亮 `#f5f7fb` / 暗 `#0f1320`（标记区覆盖生效、私有变量未误删）；`.pcard` `border-radius:12px`（改动清单第 3 条 `var(--radius)` 生效）。
- **概览卡**（`recheck-final-static.txt [B34]`、`[B41]`）：新增「本机数据概览」4 格，`ovTotal` 为三项合计（fixtures 下 1743 = 5+7+1731），复用既有摘要、未新增 localStorage 键。
- **降级文案**（`[B34]`）：`.ov-note` 与 `#foot` 均为「…保存过记录后才会出现」，正则 `打开对应页面后(会|就)自动出现` → `false` → **P2-8 已修复**。
- **reduced-motion**（`[B24']`）：`reduce:true`、`cardTransition:"0s"` → B7 达成。
- **30px 蓝系 logo / 蓝色 CTA**（`[B31]`）：home `.logo` 30×30、渐变 `rgb(79,124,255)→rgb(122,160,255)`；海报墙 logo 同款蓝渐变、`.add-btn` `rgb(79,124,255)→rgb(61,104,240)`（原粉紫 `#a855f7,#ec4899` 已替换）。

> ⚠ **P2 新发现（边缘，非阻塞）**：新增概览卡小字 `.ov-cell .k` / `.ov-cell .s`（`home.html:70,74`，`font-size:11.5px; color:var(--sub)`）在亮色 `--hover #f4f6fb` 底上对比度 **4.471:1**，比 WCAG AA 4.5 低 **0.029**；暗色同元素 6.2 达标。详见 §3。

> ⚠ **截图方法说明（非应用缺陷）**：首轮「暗色 390」截图实际为亮色——海报墙内联脚本（`书影音海报墙.html:10`）会写 `wb_theme_v1`，门户 `initTheme` 私有键优先于 `prefers-color-scheme`，会话状态污染了媒体偏好。已在干净会话 `qashot` 显式写主题键并 reload 后重拍（`recheck-screenshots.txt [B35][B36]`），`home theme=dark` / `wall theme=dark` 均已核实，截图现为真实暗色。

### ✅ 组 6 · harness / verify_partial / 分块 node --check / 无新增 JS 报错 — **PASS**

- `recheck-harness.txt [R21]`：`node /tmp/harness.js` → **52 通过 / 0 失败**（`exit=0`）；`node /tmp/verify_partial.js` → 目标组 `sec-seen` 重渲染、未动组 `sec-read/sec-listen` 零重建（`exit=0`）。`grep -c 'check(' = 53` 含第 71 行 `function check(...)` 定义 → 实际断言 **52**，与 ui-designer 回执一致。
- `recheck-static.txt [R2]`：五页分块 `node --check` → `TOTAL=11 FAIL=0`（`home 1 / index 3 / 任务台 3 / 明信片 2 / 海报墙 2` 非空块全 PASS）。`[R3]`：`sw.js` `node --check` OK；两 manifest JSON 合法；`manifest.json` `start_url="./home.html"`、3 个 shortcuts 指向三页、`ASSERT PASS`。
- `recheck-browser-interaction.txt [B29]`：五页 `errors` 全为空；`home.html` 无新增 `http(s)` 外链（排除 w3.org）。
- **XSS / 外链**（`[B33]`）：`esc()` 定义存在、`rel="noopener"` 保留。
- **键盘**（`[B28]`）：home `Tab` 第一个焦点为 `A[href=home.html]`、`:focus-visible=true`、`outline:2px`，连按可到下一卡链接；海报墙 `.pcard` `Enter` → `mask.show=true`（「红楼梦」）、`ArrowRight` → 「摩登家庭 第十一季」、`Escape` → 关闭 → B7 达成。感想脏检查由 harness M-2 覆盖。
- **几何（harness 不覆盖，已实跑）**（`[B27]`、`[B30]`）：四页 `wrapMax=1360px / bodyFont=15px / radius=12px` 全对齐；海报墙 `normal pcardW=155`、`dense pcardW=122`（干净会话，`dense` 标志与标签一致），两态 `docW=1425 / overflow:false`。对应 ui-designer §3.1 的 1360 量化值（154 / 120.4px）吻合。
- **墙视图 / 状态保持**（`[B15'][B16']`）：`#viewWall .pcard=154`、`chips=11`、统计卡渲染；排序写入 `wb_mediawall_sort_v1=rating`；`location.hash='#v=stats'` → `curView=stats`、`viewStats display:block`、含兴趣画像与平均评分；`densBtn` → `dense=true`、`wb_mediawall_dense_v1=1`。

---

## 2 按 test-plan §3 判定矩阵逐项结论

| 验收项 | 依据 | 判定 | 说明 |
|---|---|---|---|
| A1–A5 审查交付 | findings + design/spec | **不适用（本轮不重判）** | 属改前审查产物，已完成 |
| B1 门户导航 / 高亮 / 同标签 / 亮暗可读 | §2.1 §2.4 | **PASS** | 5 页真实 DOM、首页高亮、全宽、768 hint 不撑破、暗色文字达标 |
| B2 首屏层次与品牌 | 截图 | **PASS** | `recheck-home-1440-light.png`：蓝色 30px logo + 标题 + 概览卡 + 三卡，无「上半屏内容 + 下半屏空白」 |
| B3 共享 token | §1.6 | **PASS** | 4 页 IN_SYNC、`--radius` 12px/body 15px 全对齐、无 16px 漂移、暗色 `.go` 7.94 |
| B4 功能保留 | §2.2 §2.4 §2.5 | **PASS（附注 P2 见 §3）** | 三卡/摘要/刷新/主题/暗色/键盘均工作；`.card:hover` 亮暗非空；仅 `ov-cell` 小字亮色 4.471 边缘 |
| B5 数据与降级 | §2.2 边界 1–3 | **PASS** | 缺键/损坏数据全降「—」、不抛错、不写业务键 |
| B6 响应式 | §2.7 | **PASS** | 16/16 无溢出、390 单列、暗色 390 可读（截图） |
| B7 键盘 / reduced-motion | §2.5 §2.4 | **PASS** | Tab/Enter/←→/Esc 可达，reduce 时过渡 0s |
| B8 无 JS 报错 / 无外部依赖 | §2.8 | **PASS** | 五页 errors 空、无新增外链 |
| C1/C2 视觉协调与功能不回退 | §1.7 §2.6 §2.7 | **PASS** | harness 52/52 + verify_partial；另实跑几何 / normal·dense / 分析页 |
| D1 | §1.1 §1.2 | **PASS** | 11 块 node --check 全过、sw/manifest 合法 |
| D2 | §1.3 §1.4 §1.5 | **PASS** | 内联块逐字节一致、shared.js 未注入两页、index 副本一致（含 inject 后） |
| D3 | §1.6 | **PASS** | 4 IN_SYNC 含门户 |
| D4 | §1.7 | **PASS** | 52/52、verify_partial 通过 |
| D5 | §2.1–2.8 | **PASS** | 浏览器冒烟全通过、无 JS 报错 |
| E1/E2 交付说明 | 主理人 | **未验证（非 QA 判定范围）** | 需主理人补齐路径/已验证/未验证/启动方式、明确未推送上线 |

---

## 3 仍存在的问题

### 3.1 本轮新发现（P2，边缘，非阻塞）

**P2-R1【实测复现】新增「本机数据概览」小字标签亮色对比度 4.471:1，低于 WCAG AA 4.5**

- **模块/位置**：`home.html:70` `.ov-cell .k{font-size:11.5px;color:var(--sub)}`、`:74` `.ov-cell .s{...}`；底色 `home.html:69` `.ov-cell{background:var(--hover)}`（共享 `--hover:#f4f6fb`）。
- **实际触发步骤**：亮色下打开 `home.html` → 概览卡四格的标签（「本机记录合计」「任务数据状态」…）与副文案。
- **期望 / 实际**：期望 ≥4.5 → 实测 `color:rgb(107,114,128)` on `rgb(244,246,251)` = **4.471**（`recheck-browser-interaction.txt [B26]`、独立 node 复算 `[H6]`）。同色 `--sub` 在 `--bg #f5f7fb` 上为 4.508、在白卡上为 4.834，均达标；**暗色同元素 6.2 达标**。
- **影响**：11.5px 小字在亮色下略偏淡，差 0.029，**极低**；不属于 P0/P1，也不影响功能与数据正确性。
- **建议（交主理人转开发，非本轮必改）**：把 `.ov-cell .k/.s` 改用 `--ink` 或稍深的 `--muted`，或把 `.ov-cell` 底色改为 `--card`/`--bg`；一行 CSS 即可。
- **证据**：`recheck-browser-theme2.txt [B22']`、`recheck-browser-interaction.txt [B26]`、`recheck-registered-items.txt [H6]`。

### 3.2 描述 / 建议值差异（非缺陷，供主理人知悉，无需修改）

1. **私有 token 位置与改动清单措辞不同**：清单第 1 条写「私有图标色变量在 `SHARED TOKENS END` 之后」，实测 `home.html:12-24` 的 `:root` / `[data-theme="dark"]` 私有块位于 **`SHARED TOKENS START`（:85）之前**。**功能正确且安全**：`sync_tokens.js` 只替换 START–END 之间内容，实测 `sync_tokens --check` 4 IN_SYNC、亮/暗 `--ico-*` 与 `--shadow-hover` 均生效（`[B23']`）、`inject_shared.py` 沙盒注入后本页未被误改。仅表述差异，不需改代码。
2. **门户断点列数与 `design/spec.md §4.7` 建议值不同**：spec 建议 1440→3 / 1024→2 / 768→1 / 390→1；实测实现为 **1440→3 / 1024→3 / 768→2 / 390→1**（`home.html:78-83`，`@media(max-width:820px)` 2 列 + 第三卡跨列、`@media(max-width:560px)` 单列），与改动清单第 1 条「≤820 第三卡跨列、≤560 单列」完全一致。`acceptance.md B6` 只要求「无横向溢出、无重叠、卡片不错位；窄屏单列」→ 实测全部满足；且 spec 自身 §4.7 第 398/475 行已把「1024 保持 3 列」「768 取 2 列」列为**需主理人确认的可逆取舍**。故**判定为主理人已定的视觉取舍，不是缺陷**。

### 3.3 已登记挂账、本轮未改（**非回归**，均与实现前基线逐字/逐行一致）

| 挂账项 | 复核结果 | 证据 |
|---|---|---|
| 心愿单「标记完成」不写 `date`（P2-10） | 仍在：`书影音海报墙.html:3249-3252` `delete en.status;` 与基线 `:3245-3248` 逐字相同 | `recheck-final-static.txt [B32]` |
| 题材偏好混入心愿 genre（P2-11） | 仍在：`genreCnt`（`:3006-3013`）未加 `!isWish`，与基线 `:3003-3010` 逐字相同；受控数据 `wishGenreListed:true`（`[B14']`） | `[B14']` + `F2b/F3` 源码对照 |
| 海报墙双 `:root`（P2-18 / D-8） | 仍在：`:root{` 2 次、`SHARED TOKENS START` 1 次；当前无渲染故障，亮/暗 `--ink-soft` 与 hover 阴影均实测生效 | `[H1]`、`[B23']` |
| 主题私有键分歧 / 三页→门户不同步（P2-16 / D-7） | **仍复现**：门户切 dark 后再在明信片页切 light → `home=dark` / 任务台·明信片·海报墙 = `light`（`recheck-browser-theme.txt [B25]`）。为已登记挂账，按 test-plan §4.6 记为**已知限制**，不标通过也不标失败 | `[B25]`、`recheck-browser-theme2.txt [T1]` 源码 |
| 任务台运行时 manifest / 多处 SW 注册（P2-14 / D-6） | 仍在：`index.html` / `任务管理台.html` `manifest-links=2`、`serviceWorker.register` 3 处（含 1 处注释），与基线行号 `3301/11375/12648` 逐字相同；`file://` 下守卫跳过 | `[H2]`、`[H9]` |
| `file://` fetch 兜底死代码（P2-9） | 仍在：`home.html:283-288 fetchMediaCount`、`MEDIA_CACHE_KEY`；实测 `file://` 下不可达 | `[H3]` |
| PWA 离线策略（P2-15） | 仍在：`sw.js` `PRECACHE` 缺 `manifest.json` / `icon-512.png` / `icon-180.png`；`manifest-postcard.json` 兼容保留但无页面引用 | `[H4]`、`[R7]`、`[H11]` |
| 「已记录」含自定义条目却另列「自定义条目」（P2-9/P2-12 口径） | 仍在：`ovTotal` 为三项合计、`mMediaAll` 已含自定义，文案未说明包含关系 | `[B7]`、`[B41]` |
| `--radius` / `body` 等 token 漂移 | **已修复**（不再挂账） | `[R17]` |

### 3.4 明确不计缺陷的项

- 海报墙 `.section-title` 粉/琥珀/紫语义分类色、明信片空数据态、home 999px 胶囊按钮（ui-designer 已确认）。
- 装饰性图标字形亮色对比度 3.41–4.15（`.ico-*`，非正文、非交互文字）。
- `docW` 比 `innerW` 少 15px（垂直滚动条占位，非溢出）。
- 首轮 `[B13][B14]` 的 TDZ 报错与 `[B20]` 亮色误拍暗色截图（均为测试时序/会话状态 artifact，重跑通过，见 §1 说明）。

---

## 4 未验证项（如实标注，不写「全部通过」）

1. **https 部署下的 PWA 安装 / SW 注册生效 / 离线兜底**：本环境仅 `file://`，SW 在 origin `null` 下被守卫跳过（`home.html:409-411`、任务台 `12648`）；`sw.js` fetch 策略与 manifest/icons 离线可用性只能静态推断。
2. **自动翻页哨兵实际续页**：实现前基线中独立对照 `IntersectionObserver` 在本无头 Chromium 也不派发回调，属环境限制；需真实可见浏览器/真机复验 → **未验证**。
3. **GitHub Gist 云同步与多端合并**、**Safari/Firefox 跨浏览器**、**真机触控 390px**：不在本轮工具范围。
4. **真实用户全量数据下的每个数字组合**：用合成 fixtures 覆盖主要边界；真实数据仅做只读抽查（`recheck-browser-summary.txt`）。
5. **1024 / 768 暗色全量对比度**：本轮对比度全量只测 1440 亮/暗；四宽度的溢出已全测，暗色全量对比度未铺开。
6. **键盘 ↑↓ 逐键与搜索下拉、感想脏检查人工确认**：Enter/←→/Esc/Tab 已实测；↑↓ 逐键与脏检查由 harness 52 项（M-2）覆盖，未逐键人工复验。
7. **任务台 `#btnTheme` 绑定路径**：补充核查时点击未触发切换（改用明信片页显式 onclick 复现跨页不同步）；本轮未细查，若实现后主题按钮仍不工作需单独立项。
8. **E1/E2 交付说明**：由主理人产出，QA 未判定。

---

## 5 证据清单（`qa/evidence/recheck/`）

| 文件 | 内容 |
|---|---|
| `recheck-static.txt` | `[R1]` MD5 冻结、`[R2]` 11 块 node --check、`[R3]` sw/manifest、`[R4]` shared 未注入、`[R5]` index≡任务台、`[R6]` 业务键/1731、`[R7]` PWA 静态 |
| `recheck-inject-consistency.txt` | `[R16]` 10 项内联块逐字节断言 `RESULT: PASS` |
| `recheck-vault-tokens.txt` | `[R17]` 克隆/vault cmp、`sync_tokens --check` 4 IN_SYNC、四页 markers/radius/15px |
| `recheck-harness.txt` | `[R21]` harness 52/52、verify_partial、53→52 计数说明 |
| `recheck-silent-failure.txt` | `[R22][R23]` 沙盒 inject exit 0/1、sync MISSING exit 1、`[R24]` 真实 MD5 未变 |
| `recheck-browser-nav.txt` | `[B1]` 五页导航/高亮、`[B2]` 全宽几何、`[B3]` 同标签跳转、`[B4]` errors、`[B6]` 滚动条解释 |
| `recheck-browser-summary.txt` | `[B7]` fixtures=2/2、`[B8]` 缺键降级、`[B9]` 损坏数据、`[B10]` 刷新按钮 |
| `recheck-browser-mediawall.txt` | 首轮 TDZ artifact（保留以说明重跑原因） |
| `recheck-diag.txt` | `[D1]` 干净会话诊断（DOM/ready/errors 全正常）、`[D2]` 源码行号 |
| `recheck-browser-mediawall2.txt` | `[B13']` 归一 8.5/TOP12、`[B14']` 心愿 genre、`[B15']` 墙/排序/hash、`[B16']` density |
| `recheck-browser-responsive.txt` | `[B17]` 16 组溢出、`[B18]` 390 几何、`[B19]` 门户单列、`[B20][B21]` 截图 |
| `recheck-browser-theme.txt` | `[B22][B23]` 首轮（暗色构造有误，保留）、`[B24]` reduce、`[B25]` 跨页主题仍不同步 |
| `recheck-browser-theme2.txt` | `[B22'][B23'][B24']` 正确构造的亮/暗对比度与私有 token |
| `recheck-browser-interaction.txt` | `[B26]` 4.471 精确复核、`[B27]` 几何、`[B28]` 键盘、`[B29]` 五页 errors/外链 |
| `recheck-final-static.txt` | `[B30]` normal/dense 干净几何、`[B31]` 蓝系 logo/CTA、`[B32]` 挂账基线对照、`[B33]` XSS、`[B34]` 降级文案 |
| `recheck-readonly.txt` | `[B11]` 干净会话门户只读不写业务键 |
| `recheck-timezone-inject.txt` | `[B38]` 真实格式 fixture、`[B39]` 补打卡边界、`[B40]` inject 后副本一致、`[B41]` 概览合计 |
| `recheck-registered-items.txt` | `[H1]–[H7]` 挂账项、vault 副本、精确对比度、最终 MD5 |
| `recheck-tools-sw.txt` | `[H8]` vault 工具副本、`[H9][H10][H11]` SW/manifest 引用 |
| `recheck-screenshots.txt` | `[B35][B36][B37]` 显式主题重拍 + 会话关闭 |
| `recheck-home-1440-light.png` / `recheck-home-390-dark.png` | 门户亮色 1440 / 暗色 390 截图（真实主题） |
| `recheck-mediawall-1440-light.png` / `recheck-mediawall-390-dark.png` | 海报墙亮色 1440 / 暗色 390 截图（真实主题） |

---

## 6 需主理人决定的事项

1. **P2-R1（`.ov-cell` 小字 4.471）**：是否安排一行 CSS 微调；若按「视觉取舍/极低差异」接受，请在交付说明记为已知限制。
2. **D-7 跨页主题不同步**（仍复现）：若要求四页一致，需去掉门户 `wb_workbench_theme` 优先级；若保留独立覆盖，须在交付说明写明。
3. **D-1 业务逻辑类挂账项**（P2-10 心愿 date、P2-11 genre、P2-9/P2-12 口径）：本轮已登记未改，是否后续授权修复由主理人决定。
4. **D-6 / PWA 离线策略**（任务台双 manifest、多处 SW 注册、PRECACHE 缺 3 项）：均为登记挂账，是否清理由主理人决定。
5. **E1/E2 交付说明**：需补齐路径 / 已验证 / 未验证 / 启动方式，并明确「未推送上线」。
6. **§3.2 两处描述差异**：建议主理人在改动清单或交付说明里对齐措辞（私有 token 位于 START 之前；断点为 ≤820/≤560），避免后续维护者按「END 之后」或 spec §4.7 旧值误改。

---

## 7 交付建议

**可按已验证范围交付（改后版本）**。核心条件 B1–B8 / C1–C2 / D1–D5 全部达成，改前基线的 P1-1～P1-7（导航条、token 漂移、暗色 `.go`、三处数字口径、评分归一、inject targets）与 P2-8 / P2-13 / P2-19 均已实测修复，未发现新的 P0/P1 回归。唯一新增问题为 P2 边缘对比度（4.471），不构成阻塞；挂账项与改动清单第 6 条一致，须在交付说明中如实列出。最终交付决定由主理人作出，本成员不自行发布、部署或联系用户外部人员。

---

## 附录 A · 第二轮补充复核（主理人催办，改后最终快照）

**范围**：针对催办列出的 6 项，补做第一轮未显式覆盖的 3 类路径 —— ① 品牌区/三卡/概览卡左边界对齐与 1360 容器；② URL hash 越界与非法参数；③ 无 localStorage / 空数据集 / 混合评分边界；同时复测 390px 溢出、`#vStats` 可点击性、暗色对比度（引用第一轮证据）。
**写入约束**：本轮**只写 `qa/recheck.md`**，未新建证据文件、未改应用源码、未改用户报告 `Projects/站点统一_全量审查报告_20261104.md`（只读确认存在，19847 bytes）。会话 `qaround2` / `qaround3`，结束均已 `close`；合成数据只写独立会话 localStorage。
**版本复核**：第二轮开工前再次 `md5 -q` 五文件，与派发清单逐字一致；结束时 `git status --short` 仍为 `M _shared/inject_shared.py` / `M home.html` / `M 书影音海报墙.html` / `?? deliverables/`。

### A.1 逐项 PASS / FAIL（对齐催办 6 项）

| 催办项 | 判定 | 关键实测值 | 证据 |
|---|---|---|---|
| 1) 390px 四页 `scrollWidth ≤ innerWidth`、零横向溢出 | **PASS** | 四页均 `innerW=390 / scrollW=375 / ok:true`（375 为垂直滚动条占位，非溢出）；第一轮 16/16 组亦全部 `overflow:false` | `A.2 [N5]`；`recheck-browser-responsive.txt [B17]` |
| 1) 海报墙 `#vStats` 可见**且可用** | **PASS** | 390px 下 `{l:185,r:281,w:95,inViewport:true,tag:BUTTON}`；点击后 `curView=stats`、`viewStats display:block`、`viewWall display:none`、`hash=#v=stats`、含「平均评分」、`docW=375 ≤ 390`、errors 空 | `A.2 [N6]`；`recheck-browser-responsive.txt [B18]` |
| 2) 门户 `__wsn_bar` 存在且「首页」高亮 | **PASS** | 5/5 页真实 DOM `nav:true`；`home` 高亮 `["首页"]`、`on`=`cur`（aria-current）、`blank:0`、4 个相对 href | `recheck-browser-nav.txt [B1]` |
| 2) 品牌区/三入口卡/概览卡左边界对齐 | **PASS** | 1440px：`.head=58`、`.grid=58`、`.overview=58`、`#cardTasks=58`（`allContentLeftAligned:true`）；`#cardPostcards=504.7`、`#cardMedia=951.3` 为 3 列栅格正常列位（gap 16px），非错位 | `A.2 [N1']` |
| 2) 1440px 容器 1360px | **PASS** | `.wrap{maxWidth:1360px}`，`{l:40,r:1400,w:1360}`，`paddingLeft:18px` → 内容左边界 58；导航条 `{l:0,r:1440}` 全宽 | `A.2 [N1]`；`recheck-browser-interaction.txt [B27]` |
| 3) 评分归一 `r10=rating>5?rating:rating*2`、无 NaN、无 5/10 混算 | **PASS** | 受控 (9,4)→平均 8.5、TOP12 `9→8`；混合集 (3,5,9,10,无评分,0)→`平均评分 8.8 / 4 条有评分`、TOP12 显示 `10,10,9,6`（3→6、5→10 已归一）、分布 `9-10分 3 / 6-7分 1`、无评分与 0 分被 `filter(i=>i.rating)` 排除；`hasNaN:false`、`Infinity` 无；`MEDIA=[]` → 平均「—」+「暂无已完成记录」空态、TOP12 空、无 NaN、errors 空 | `A.2 [N3a][N3b]`；`recheck-browser-mediawall2.txt [B13']`；源码 `书影音海报墙.html:2978,3022,3045-3051` |
| 4) 门户摘要口径（`doneOnDate` 复刻 / 在途 / 已到已收） | **PASS** | 5 条 fixtures → 今日完成 **2**（2020 历史完成不计、今日完成 + 今日打卡重复任务各 1）、在途 **2**、已到/已收 **2**；用任务台真实写入格式 `YYYY-MM-DDTHH:MM` 重测仍为 2，补打卡边界组合 `done=2/open=0/all=2` | `recheck-browser-summary.txt [B7]`；`recheck-timezone-inject.txt [B38][B39]`；源码 `home.html:238-271` |
| 5) `index.html ≡ 任务管理台.html` | **PASS** | `cmp -s` → `IDENTICAL`；沙盒运行 inject 之后仍 `IDENTICAL` | `recheck-static.txt [R5]`；`recheck-timezone-inject.txt [B40]` |
| 5) SITE-NAV / SHARED 内联块与源文件逐字节一致 | **PASS** | 10/10 项 `OK`、`RESULT: PASS`（SITE-NAV 5 页含 home/index；SHARED 仅任务台/明信片/index，海报墙与门户 `present=0`） | `recheck-inject-consistency.txt [R16]` |
| 5) `sync_tokens.js --check` 四页 IN_SYNC | **PASS** | exit 0，4 行 IN_SYNC 含 `home.html`；`TARGETS` 4 页；克隆/vault 四页 `cmp IDENTICAL` | `recheck-vault-tokens.txt [R17]`；`recheck-tools-sw.txt [H8]` |
| 6) 暗色主题对比度 | **PASS（含 1 项 P2 边缘）** | `.go` 暗 7.94 / 亮 5.48（基线 3.59）；`desc 6.67 / h2 14.2 / nav 4.73 / ovk 6.2` 暗色达标；新增概览卡小字 `.ov-cell .k/.s` 亮色 **4.471 < 4.5**（差 0.029，暗色 6.2 达标）→ 见 §3.1 P2-R1 | `recheck-browser-theme2.txt [B22']`；`recheck-browser-interaction.txt [B26]` |
| 6) 无 localStorage 数据 | **PASS** | 清空全部 `wb_` 键后 12 项指标全「—」、`dim=8`、`wbKeys=[]`（门户不写业务键）、无 NaN/undefined、errors 空 | `A.2 [N2a]`；`recheck-readonly.txt [B11]` |
| 6) 空数据集 | **PASS** | `wb_taskhub_v1='[]'`、明信片四数组空、stats `total:0`、custom `[]` → 任务/媒体显示 `0`（非 NaN/undefined）、明信片三项降级「—」（`summaryPostcards():270` 四数组全空时 `return null`，属设计内降级）、`dim=3`、errors 空；`MEDIA=[]` 分析页空态正常 | `A.2 [N2b][N3a]` |
| 6) URL hash 越界 | **PASS** | 9 组非法/越界 hash 全部：无 JS 报错、无 NaN、无白屏、状态值合法、无 XSS 注入；越界参数被 `applyHash():2823-2832` 白名单过滤后由 `syncHash()` 规范化 | `A.3 [N4]`；`A.4 [N7]` |

### A.2 命令与输出（左边界 / 空数据 / 评分边界）

```
# [N1] 1440px 对齐（agent-browser --session qaround2 eval --stdin，getBoundingClientRect）
"{\"innerW\":1440,\"wrapMax\":\"1360px\",\"wrap\":{\"l\":40,\"r\":1400,\"w\":1360},\"head\":{\"l\":58,...},\"grid\":{\"l\":58,...},\"overview\":{\"l\":58,...},\"cards\":[{\"l\":58},{\"l\":504.7},{\"l\":951.3}],\"nav\":{\"l\":0,\"r\":1440,\"w\":1440},\"aligned\":true,\"alignedAt\":58}"

# [N1'] 修正后的断言：三卡为栅格列位，首卡与三个区块同左边界
"{\"items\":{\"head\":58,\"grid\":58,\"overview\":58,\"card1\":58,\"card2\":504.7,\"card3\":951.3,\"wrap\":40,\"nav\":0},\"allContentLeftAligned\":true,\"wrapPadding\":\"18px\",\"gridGap\":\"16px\"}"
```

> 首轮曾出现 `threeCardsAligned:false`，是**我的断言写错**（要求 3 列栅格里三张卡都在同一左边界），不是应用缺陷；修正为「首卡 + 三个区块对齐」后为 `true`。

```
# [N2a] 全部 wb_ 键清空（含 theme）→ 门户降级
"{\"vals\":{\"mTaskOpen\":\"—\",\"mTaskDone\":\"—\", ... \"ovMedia\":\"—\"},\"dim\":8,\"wbKeys\":[]}"   errors=（空）

# [N2b] 空数据集（空数组 / 空对象 / total:0）
"{\"vals\":{\"mTaskOpen\":\"0\",\"mTaskDone\":\"0\",\"mTaskAll\":\"0\",\"mPcTransit\":\"—\",\"mPcArrived\":\"—\",\"mPcAll\":\"—\",\"mMediaAll\":\"0\",\"mMediaCustom\":\"0\",\"ovTotal\":\"0\"},\"dim\":3}"   errors=（空）
```

> `hasNaN:true` 是**误报**：我用 `document.body.textContent` 检测，它会把内联 `<script>` 源码里的 `undefined` 字面量（script[0] 命中 4 处）算进去。改用渲染文本 `document.body.innerText` 复核 → `innerTextHasNaN:0`、`innerTextMatches:[]`。**可见文本无 NaN/undefined/Infinity**。

```
# [N3a] MEDIA=[] → renderStatsView()
"{\"avgCard\":\"平均评分—0 条有评分（5 星制已换算为 10 分制）\",\"hasNaN\":false,\"hasEmptyState\":true,\"cardsCount\":5,\"topItems\":0,\"bodyLen\":7940}"   errors=（空）

# [N3b] 混合评分 (3,5,9,10,无评分,0)
"{\"avgCard\":\"平均评分8.8 4 条有评分（5 星制已换算为 10 分制）\",\"tops\":[{\"t\":\"B五分5\",\"sc\":\"10\"},{\"t\":\"D十分10\",\"sc\":\"10\"},{\"t\":\"C十分9\",\"sc\":\"9\"},{\"t\":\"A五分3\",\"sc\":\"6\"}],\"dist\":\"我的评分分布9-10 分 3 8-9 分 0 7-8 分 0 6-7 分 1 6 分以下 0\",\"hasNaN\":false}"   errors=（空）
```

**评分口径核算**：`r10` = `rating>5 ? rating : rating*2` → 3→6、5→10、9→9、10→10；`rated` 过滤无评分与 0 分后 4 条，平均 `(6+10+9+10)/4=8.75` → `toFixed(1)` = **8.8**；TOP12 按归一值降序 `10,10,9,6`；分布桶 `9-10分:3`（10,10,9）、`6-7分:1`（6）。**平均、分布、TOP12 三处同口径，无 5/10 分制混算、无 NaN**。

### A.3 命令与输出（URL hash 越界，修正版）

> 首次循环用 `${h@Q}`（bash 特性）在 zsh 下报 `bad substitution`，hash 从未被设置，输出 `hash:""` 全为无效结果 —— 已作废，改用 python 生成 base64 的 JS 通过 `agent-browser eval -b` 注入。此为**测试方法修正，不是应用缺陷**。

```
for h in '#v=nonexistent' '#v=__proto__&s=bogus&f=nope&q=<img src=x onerror=alert(1)>' \
         '#s=rating&v=stats&f=不存在&q=zzzznotfound' '#v=wall&v=stats&s=year&s=bogus' \
         '#' '#&&&&&' '#v=stats&p=999999' '#q=%00%01%02' '#f=<script>alert(1)</script>'; do
  B64=$(python3 -c '...js="(()=>{location.hash="+json.dumps(h)+";...})()"...' "$h")
  agent-browser --session qaround2 eval -b "$B64"; ...; agent-browser --session qaround2 errors
done
```

| 输入 hash（节选） | 规范化后 hash | curView / filter / sort | 墙卡片 | 可见文本长 | 注入 onerror | 原生 `<img src=x` | NaN | errors |
|---|---|---|---|---|---|---|---|---|
| `#v=nonexistent` | `""` | wall / 全部 / default | 154 | 7940 | 0 | false | false | 空 |
| `#v=__proto__&s=bogus&f=nope&q=<img…alert(1)>` | `#q=%3Cimg...%3E` | wall / 全部 / default | 0（无结果态） | 416 | 0 | false | false | 空 |
| `#s=rating&v=stats&f=不存在&q=zzzznotfound` | `#v=stats&s=rating&q=zzzznotfound` | **stats** / 全部(非法 f 被丢弃) / **rating** | 0 | 2655 | 0 | false | false | 空 |
| `#v=wall&v=stats&s=year&s=bogus` | `#s=year` | wall / 全部 / **year**（重复键取首值，bogus 被丢） | 144 | 7323 | 0 | false | false | 空 |
| `#` | `""` | wall / 全部 / default | 154 | 7940 | 0 | false | false | 空 |
| `#&&&&&` | `""` | wall / 全部 / default | 154 | 7940 | 0 | false | false | 空 |
| `#v=stats&p=999999` | `#v=stats` | **stats** / 全部 / default（未知 p 被丢） | 154 | 2632 | 0 | false | false | 空 |
| `#q=%00%01%02` | `#q=%00%01%02` | wall / 全部 / default | 0（无结果态） | 364 | 0 | false | false | 空 |
| `#f=<script>alert(1)</script>` | `""` | wall / 全部 / default | 154 | 7940 | 0 | false | false | 空 |

**结论**：9/9 组均无 JS 报错、无 NaN/undefined、无白屏、`curView` 只取 `wall|stats`、`filter`/`sort` 只取白名单值；越界/未知/重复参数被 `applyHash()` 丢弃后由 `syncHash()` 用 `history.replaceState` 规范化。`<img onerror=alert(1)>` 与 `<script>alert(1)</script>` 只作为 `q` 值进入 `searchBox.value`（纯文本），`injectedOnerror=0`、`rawImgInDOM=false`，**未进入 DOM 成为可执行节点**（`esc()` / `hiLite()` 生效）。

> 关于 `img[onerror]=154`：源码 `书影音海报墙.html:2490-2492` 的 `onerror` 是**静态字面量**的海报加载失败占位回退（`this.remove()` / 插入「海报加载失败」span），共 3 种固定写法，随卡片数量线性出现；`src/alt` 均经 `esc()` 转义。非 XSS 注入，不计缺陷。

### A.4 命令与输出（390px 复测 / `#vStats` 可用 / 无结果空态）

```
# [N5] 390×844，四页 documentElement.scrollWidth ≤ innerWidth
home.html        {"innerW":390,"scrollW":375,"ok":true}
任务管理台.html   {"innerW":390,"scrollW":375,"ok":true}
明信片追踪.html   {"innerW":390,"scrollW":375,"ok":true}
书影音海报墙.html {"innerW":390,"scrollW":375,"ok":true}

# [N6] 390px 点击 #vStats（可见 → 可用）
before: {"curView":"wall","statsDisplay":"none"} btn={"l":185,"r":281,"w":95,"inViewport":true,"tag":"BUTTON"}
after : {"curView":"stats","statsDisplay":"block","wallDisplay":"none","hash":"#v=stats","hasAvg":true,"docW":375,"innerW":390,"ok":true}   errors=（空）

# [N7] 搜索无结果空态（解释 hash 越界用例里的 visibleLen=364/416 不是白屏）
"没有找到「zzzznotfound」相关条目"  hasNav:true  hasStats:true  visibleLen:384   errors=（空）
```

### A.5 本轮残留风险清单（并入交付说明）

1. **P2-R1（唯一新增，非阻塞）**：概览卡 `.ov-cell .k/.s` 亮色对比度 4.471 < 4.5，差 0.029；暗色 6.2 达标。见 §3.1。
2. **挂账项（改动清单第 6 条，非本轮回归）**：心愿完成不写 date、genre 混入题材偏好、双 `:root`、任务台双 manifest / 3 处 SW 注册、`file://` fetch 兜底死代码、PWA `PRECACHE` 缺 `manifest.json`/`icon-512`/`icon-180`、已记录与自定义条目并列口径；**三页→门户主题不同步仍复现**（D-7，记为已知限制）。见 §3.3。
3. **描述差异（非缺陷）**：私有 token 在 SHARED TOKENS **START 之前**（清单写「END 之后」）；门户断点为 ≤820/≤560（spec §4.7 建议 1024→2 / 768→1），实测 1440=3 / 1024=3 / 768=2 / 390=1，`acceptance B6` 全部满足。见 §3.2。
4. **本轮仍未验证**：https 部署 PWA 安装 / SW 离线兜底、自动翻页哨兵（无头 Chromium 不派发 IntersectionObserver）、Gist 云同步与多端合并、Safari/Firefox、真机触控、真实用户全量数据组合、1024/768 暗色全量对比度、键盘 ↑↓ 逐键、任务台 `#btnTheme` 绑定路径、E1/E2 交付说明。见 §4。

### A.6 第二轮结论

催办 6 项**全部 PASS**，无 FAIL、无新增 P0/P1；与第一轮结论一致：**可按已验证范围交付（改后版本）**。报告完整路径 `/tmp/toolsrepo2/deliverables/site-ui-review-1104/qa/recheck.md`；第一轮证据 `qa/evidence/recheck/`（24 个 `recheck-*` 文件，含 `recheck-home-1440-light.png` / `recheck-home-390-dark.png` / `recheck-mediawall-1440-light.png` / `recheck-mediawall-390-dark.png` 四张真实主题截图）。本轮命令输出已内嵌于本附录，未新建证据文件。
