# 自检记录 · site-ui-review-1104（开发成员 / 收敛后如实版）

> **按主理人最后一条指令编写**：只记录本成员**实际跑过**的命令与结果；没跑的一律不写 PASS。主理人已接手剩余项并要求本成员「不再做新的实现或新的验证」，因此**本文件所有结论均为 19:55 clone→vault 同步后的文件状态下取得**；主理人此后对源码的任何改动，本成员**未核验、不背书**。
> 本轮追加需求（`.grid max-width:1120px`、logo 36px、`min-height:320px`、私有变量移至 END 之后、色相/CTA 渐变/`.pcard` 圆角、`index.html` 进 inject targets、评分归一等）对应的检查**全部未跑**，集中列于 §8「未跑的检查」。

## 0. 环境与执行前提

- OS：macOS（BSD 工具链，`grep` 的 BRE `\|` 不可用；内容检索走 ripgrep/Grep 工具）
- Node：`v22.22.2`；Python 3；`agent-browser` 1.3.0（Chromium，file:// 打开）
- 输入：commit `87d8ba6` 之后的工作副本；克隆 `/tmp/toolsrepo2/`
- 浏览器会话：`--session dev1104`。**注意**：本轮有其他成员共用同一个 agent-browser daemon，默认会话 viewport 一度被改成 390、导航出现竞态；故改用命名会话隔离，且每次断言在同一 eval 内回读 `innerWidth` 防漂移。file:// 的 localStorage 在同一 daemon 内跨会话共享，`set media dark` 不能覆盖已存 `wb_theme_v1="light"`，暗色视觉检查改用 `eval` 直接置 `data-theme="dark"` 并 `wait 350` 后取值。
- 19:55 同步后 clone/vault 逐字节一致：`home.html` MD5 `4e55dd35ec8305d99b3011b5dcbbdcf9`（22891 B），`书影音海报墙.html` MD5 `d2b30b8c821fbaa94a8f36f8bcc66c74`（539414 B）。

---

## 1. 五个 HTML 按 `<script>` 分块 `node --check`；`sw.js` / manifest 合法 → **PASS（跑过）**

命令：

```bash
node -e '<提取 5 个 HTML 的每个 <script> 块写入 /tmp/_synchk/*.js，逐块 execFileSync(node --check)>'
node --check /tmp/toolsrepo2/sw.js
node -e 'JSON.parse(manifest.json); JSON.parse(manifest-postcard.json)'
python3 -m py_compile /tmp/toolsrepo2/_shared/inject_shared.py
node --check "/Users/chenhuiying/Documents/Obsidian Vault/_ops/_workbench/sync_tokens.js"
```

输出摘要：

```
home.html: 1 script block(s)        PASS block 0 (10039 chars)
index.html: 3                      PASS block 0/1/2
任务管理台.html: 3                 PASS block 0/1/2
明信片追踪.html: 2                 PASS block 0/1
书影音海报墙.html: 3               PASS block 0/1/2（block 1 为空块）
TOTAL=12 FAIL=0
sw.js node --check PASS
manifest.json JSON OK · name=工作台 · start_url=./home.html
manifest-postcard.json JSON OK · name=明信片追踪 · start_url=./明信片追踪.html
py_compile PASS / node --check sync_tokens.js PASS
```

同步版 home.html（19:55 他人改写后）重跑：`PASS block 0`（唯一 `<script>`，含注入的 SITE-NAV）。

## 2. NAV / SHARED 内联块逐字节一致；`index.html` 与 `任务管理台.html` 一致 → **PASS（跑过，限于当时配置）**

命令：`node -e '<按 BEGIN/END 取块，与 _shared/*.js 经 rstrip 后拼 "\n"+src+"\n" 逐字节比较>'`

输出摘要（19:55 同步版 home.html 改动后复跑）：

```
--- SITE-NAV 内联块 vs _shared/site-nav.js ---
PASS home.html        (block 4239 chars)
PASS 任务管理台.html   (block 4239 chars)
PASS 明信片追踪.html   (block 4239 chars)
PASS 书影音海报墙.html (block 4239 chars)
--- SHARED 内联块 vs _shared/shared.js ---
PASS 任务管理台.html   (block 26954 chars)
PASS 明信片追踪.html   (block 26954 chars)
--- 海报墙 / 门户 未被注入 SHARED（铁律）---
PASS 书影音海报墙.html 无 SHARED 块
PASS home.html 无 SHARED 块
--- index.html 与 任务管理台.html 逐字节一致 ---
PASS index.html (831354) vs 任务管理台.html (831354)
FAIL=0
```

注入命令：`python3 /tmp/toolsrepo2/_shared/inject_shared.py`
```
[SHARED] shared.js → 2 页    已同步: 任务管理台.html / 明信片追踪.html
[SITE-NAV] site-nav.js → 4 页 已同步: 任务管理台.html / 明信片追踪.html / 书影音海报墙.html / home.html
```

**重要限制（P1-7）**：此 PASS 是在「`index.html` 不在两个 targets 内」的配置下取得；当时因共享源未变、注入未改写 `任务管理台.html`，副本铁律成立。主理人已指出该配置脆弱并要求把 `index.html` 加入 SHARED 与 SITE-NAV 两个 targets 后重跑注入 + `cmp`。**本成员未做该改动、未跑该断言**（见 §8）。

## 3. `node sync_tokens.js --check` 四页 IN_SYNC → **PASS（跑过）**

命令与输出：

```bash
cd "/Users/chenhuiying/Documents/Obsidian Vault/_ops/_workbench"
node sync_tokens.js            # 写模式（no-op）
node sync_tokens.js --check
```

```
[IN_SYNC] 任务管理台.html  (IN_SYNC)
[IN_SYNC] 明信片追踪.html  (IN_SYNC)
[IN_SYNC] 书影音海报墙.html  (IN_SYNC)
[IN_SYNC] home.html  (IN_SYNC)
exit=0
```

补充（clone 侧用与脚本相同的替换逻辑比对标记区）：

```
IN_SYNC  home.html         region 1561 chars
IN_SYNC  任务管理台.html    region 1561 chars
IN_SYNC  明信片追踪.html    region 1561 chars
IN_SYNC  书影音海报墙.html  region 1561 chars
CLONE four-page token check: FAIL=0
```

**已记录的既有缺陷**：vault 同步前 `home.html` 无标记区时，`--check` 输出 `[IN_SYNC] home.html (NO_MARKERS)` 且 exit=0（把 NO_MARKERS 误报成 IN_SYNC）。已报告；同步后复跑为真四页 IN_SYNC。私有变量（`--shadow-hover`、`--ico-*`）静态断言确认在标记区之外，但**未**验证追加要求「必须写在 END 标记之后」的位置（见 §8）。

## 4. `node /tmp/harness.js` 52/52；`node /tmp/verify_partial.js` 通过 → **PASS（跑过）**

两个桩读 `/tmp/toolsrepo2/书影音海报墙.html`；最终版（与 vault 同 MD5）复跑：

```
结果: 52 通过 / 0 失败                     (harness.js exit=0)
✓ 目标组 sec-seen 已重渲染
✓ 未动组 sec-read/sec-listen 零重建（局部渲染生效）   (verify_partial.js exit=0)
```

## 5. 浏览器实测（agent-browser，`--session dev1104`）→ **PASS（跑过，限于 19:55 版本）**

命令形态：

```bash
agent-browser --session dev1104 set viewport 1440 900
agent-browser --session dev1104 open "file:///tmp/toolsrepo2/<页面>"
agent-browser --session dev1104 eval "<计算式>"      # 复杂式用 eval -b <base64>
agent-browser --session dev1104 click "#vStats" / "#btnTheme" / "#btnRefresh"
agent-browser --session dev1104 screenshot /tmp/dev1104_shots/*.png
agent-browser --session dev1104 console --clear / errors --clear / console / errors
agent-browser --session dev1104 close
```

截图：`/tmp/dev1104_shots/home_light_1440.png`、`home_dark_1440_v2.png`、`posterwall_390.png`。

### 5.1 四页 1440×900：导航条 / 高亮 / 链接 / 无横向溢出

| 页面 | `__wsn_bar` | 高亮 | scrollWidth / innerWidth | 溢出 |
|---|---|---|---|---|
| home.html | 有 | 首页 | 1440/1440 | false |
| 任务管理台.html | 有 | 任务台 | 1425/1440 | false |
| 明信片追踪.html | 有 | 明信片 | 1440/1440 | false |
| 书影音海报墙.html | 有 | 海报墙 | 1425/1440 | false |

链接均为「首页→home.html / 任务台→任务管理台.html / 明信片→明信片追踪.html / 海报墙→书影音海报墙.html」。（`1425` = 1440 减去 15px 纵向滚动条，非溢出。）

### 5.2 home.html 1440 亮色 computed style（首轮冻结数值）

```json
{"theme":"light","barH":43,"footBottom":747,"barBottom":43,
 "scrollWidth":1440,"innerWidth":1440,"wrapMax":"1360px","wrapPad":"20px 18px 40px",
 "gridCols":"430.656px 430.672px 430.656px","gridGap":"16px","cardCount":3,
 "cardHeights":[305,305,305],"cardRadius":"16px","cardPad":"22px",
 "h2":"18px","desc":"13px","metricN":"26px","goSize":"13px",
 "ico":[{"w":"44px","h":"44px","r":"12px","f":"21px","bg":"rgb(234, 240, 255)","fg":"rgb(61, 104, 240)"},
        {"w":"44px","h":"44px","r":"12px","f":"21px","bg":"rgb(253, 234, 241)","fg":"rgb(212, 83, 126)"},
        {"w":"44px","h":"44px","r":"12px","f":"21px","bg":"rgb(240, 234, 254)","fg":"rgb(139, 92, 246)"}],
 "goColors":["rgb(47, 95, 224)","rgb(47, 95, 224)","rgb(47, 95, 224)"],
 "logo":{"w":"30px","h":"30px","r":"9px","bi":"linear-gradient(135deg, rgb(79, 124, 255), rgb(122, 160, 255))"},
 "overview":true,"ovTotal":"1736","ovTaskS":"已读取 · 共 5 条","ovTime":"最近刷新 19:54",
 "metricVals":["5","0","5","—","—","—","1731","—"]}
```

> 这些数值对应**首轮冻结值**（卡片 430.6px、logo 30px、卡高 305px）。主理人收敛后的新值（`.grid` 1120px → 约 363px、logo 36px、`min-height:320px`）**本成员未实现、未实测**，故本表不能作为新规范的验收依据。

- 首屏内容底边 y=747px ≥560px（原约 400px）→ **PASS**
- 摘要数值：本机 `wb_taskhub_v1` 5 条 / `wb_mediawall_stats_v1` 1731，`wb_postcards_v1` 缺失故三项降级「—」，概览合计 1736 → **PASS**
- 「刷新摘要」点击后 `ovTime` 更新（19:54→19:55）；「切换主题」dark→light→dark 属性正确 → **PASS**

### 5.3 home.html 暗色主题

```json
{"theme":"dark","bodyBg":"rgb(15, 19, 32)","bodyInk":"rgb(231, 235, 243)",
 "cardBg":"rgb(23, 28, 43)","go":"rgb(143, 176, 255)"}
```
图标底色（暗）`#1c2740 / #3a1f2c / #2a2140`，图标色 `#8fb0ff / #f19ab8 / #b79aff`，`.go` `#8fb0ff`；截图目视无刺眼亮块、文字可读 → **PASS**。
（在已加载页面 `setAttribute` 后立即读 `body` 背景会因 `transition:background .2s` 取到过渡中间值；改为重新载入 + `wait 350` 后取稳定值。）

### 5.4 书影音海报墙 1440（E）

```json
{"wrapMax":"1360px","wrapPad":"0px 18px","wrapLeft":33,"contentLeft":51,
 "brandLeft":51,"subtypeCols":"155px ×8","subtypeColCount":8,
 "cardCount":154,"cardW":155,"cardRightOverflow":0,
 "nameCount":154,"nameOverflowCount":0,"maxNameDelta":0,
 "vStatsExists":true,"vStatsRight":1375,"searchW":460,
 "sw":1425,"iw":1440}
```

- 8 列 139px→155px，154 张卡无右溢出；标题 `scrollWidth-clientWidth` 全为 0，按「必要时」未加单行省略 → **PASS**
- `#vStats.right=1375 ≤ 1440` 可见 → **PASS**
- 左边界 51px：无滚动条时应为 58px（与明信片一致）；7px 差值来自 headless Chromium 15px 经典滚动条。`.pcard` 圆角当时仍为 10px（主理人追加的 `var(--radius)` 未做，未测）。

### 5.5 390×844 四页无横向溢出 → **PASS**

| 页面 | 高亮 | scrollWidth / innerWidth | 溢出 |
|---|---|---|---|
| home.html | 首页 | 375/390 | false |
| 任务管理台.html | 任务台 | 375/390 | false |
| 明信片追踪.html | 明信片 | 375/390 | false |
| 书影音海报墙.html | 海报墙 | 375/390 | false |

### 5.6 海报墙 390 P0 断言 → **PASS**（最高优先，最先完成）

```json
{"iw":390,"sw":375,"scrollWidthOK":true,
 "vStats":{"l":185,"r":281,"t":197,"w":95,"h":37},"vStatsRightOK":true,"vStatsVisible":true,
 "search":{"l":18,"r":106,"t":149,"w":88,"h":36},"searchVisible":true,"searchWidthOK":true,
 "toolbar":{"l":18,"r":357,"t":145,"w":339,"h":89},
 "viewtabs":{"l":18,"r":357,"t":197,"w":339,"h":37},"viewtabsOrder":"3",
 "chips":{"l":0,"r":375,"t":244,"w":375,"h":38},
 "topbar":{"l":0,"r":375,"t":131,"w":375,"h":161},"topbarHeight":161,
 "subtypeCols":"107.656px ×3"}
```

- `scrollWidth 375 ≤ innerWidth 390` ✓；`#vStats.right 281 ≤ 390` 且可见 ✓；搜索框可见、宽 88px > 80px ✓
- 第一行 `searchBox 18–106 / btnAdd 116–213 / btnExport 223–285 / btnImport 295–357` 互不重叠；第二行 `vWall 94–177 / vStats 185–281` 居中、`order:3` ✓
- `.chips` 0–375 恰为视口宽 ✓；topbar 161px（约 +44px）✓
- 点击 `#vStats`：`{statsShown:true, wallHidden:true, vStatsOn:true, sw:375, iw:390}` ✓
- 390px 下 `.subtype` 3 列（≤460px 断点），未改断点/列数 ✓

### 5.7 home.html 响应式 → **PASS**（首轮数值）

- 768×900：`gridCols "350.5px 350.5px"`，第 3 张卡 `gridColumn 1/-1`、宽 717px，无溢出（753/768）
- 390×844：`gridCols "347px"` 单列，`.wrap padding "16px 14px 32px"`，无溢出
- 1024×768：四页高亮正确、均无溢出（1009 或 1024 / 1024）；海报墙 `.subtype` 7 列、卡宽 129px

## 6. `console` / `errors` 无新增 JS 报错 → **PASS（跑过）**

```bash
agent-browser --session dev1104 console --clear
agent-browser --session dev1104 errors --clear
for f in home.html 任务管理台.html 明信片追踪.html 书影音海报墙.html; do open ...; done
agent-browser --session dev1104 errors    # 输出为空
agent-browser --session dev1104 console   # 输出为空
```

## 7. 附加检查（本成员主动补充，均跑过）

### 7.1 业务逻辑隔离单元测试 → **PASS**
从当时落盘的 `home.html` 抽取 `summaryTasks()` / `summaryPostcards()`，用 `new Function` 注入 `read` / `today` 桩，自建 9 条任务 + 明信片 fixtures：

```
CURRENT summaryTasks     = {"open":3,"done":3,"all":9}
CURRENT summaryPostcards = {"transit":4,"arrived":4,"all":15}
PASS 当前实现逻辑自洽（done:3 open:3 all:9 / transit:4 arrived:4 all:15）
```

原缺陷已消除：无当日完成证据的历史 `status==="done"` 任务不再计入今日完成；在途/已收按 pc+rc 分别计数（旧逻辑同 fixtures 会得 `transit:2 arrived:6`）。
**限制**：这是本成员自建 fixtures；**QA 给出的 5 条任务反例（正确今日完成=2）未单独跑**，不做 PASS 声明。

### 7.2 home.html 静态断言 → **PASS**
```
IDs preserved: PASS（12 个 id 全在）
no .navlinks: PASS
serviceWorker.register count: 1 (来自注入的 site-nav.js): PASS
manifest/theme-color/icons: PASS
SHARED TOKENS markers: PASS
private tokens OUTSIDE markers: PASS / private vars not inside marker region: PASS
inline style on ico removed: PASS
go light var(--pri-ink): PASS / go dark override #8fb0ff: PASS
cards use --radius-lg: PASS / 3rd card span @820: PASS
prefers-reduced-motion: PASS / focus-visible: PASS
```
`design_tokens.css` MD5 `25735f4eaef4c363b2a0e3bf8a537a0b`，本轮未改。

---

## 8. 逐条结论 + 未跑的检查（不写 PASS）

### 8.1 本成员实际跑过的检查

| # | 检查 | 结果 |
|---|---|---|
| 1 | 五 HTML 分 script 块 `node --check`；sw.js / manifest JSON / py_compile / sync_tokens.js 语法 | **PASS** |
| 2 | NAV 内联块与 site-nav.js 一致（含 home.html）；SHARED 与 shared.js 一致；index.html 与任务台逐字节一致 | **PASS（限当时 inject 配置，不含 index.html target）** |
| 3 | `node sync_tokens.js` + `--check` 四页 IN_SYNC | **PASS**（同步后；同步前有 NO_MARKERS 误报，已报告） |
| 4 | `harness.js` 52/52、`verify_partial.js` 通过 | **PASS** |
| 5 | 浏览器实测 1440/390（含 1024/768）：四页导航/高亮、门户亮暗可读、摘要数值、390 无横向溢出、海报墙 8 列卡片无溢出、`#vStats` 可见 | **PASS（19:55 版本、首轮冻结数值）** |
| 6 | console / errors 无新增 JS 报错 | **PASS** |
| 7 | 附加：业务逻辑 fixtures 单测、home.html 静态断言 | **PASS（自建 fixtures，非 QA 5 条反例）** |

### 8.2 本成员**未跑**、由主理人接手的检查（一律不标 PASS）

| # | 对应追加需求 | 未跑的检查 |
|---|---|---|
| 1 | P1-7 | 把 `index.html` 加入 SHARED + SITE-NAV 两个 targets 后重跑 `python3 _shared/inject_shared.py`，再 `cmp index.html 任务管理台.html` |
| 2 | P1-6 评分归一 | 分析页 `avg` 归一断言（受控数据或直接读 DOM 比对归一值）；主理人明确要求补进 checks.md，**本成员未跑、未写** |
| 3 | 收敛第 2 条 | `.grid max-width:1120px`、三卡约 363px、`.card min-height:320px`、logo 36px 的浏览器 computed style 断言 |
| 4 | 收敛第 3 条 | CTA 渐变 `linear-gradient(135deg,var(--pri),var(--pri-deep))`、`.brandbar .logo` `#7aa0ff`、`.pcard` `var(--radius)` 的视觉/计算值断言 |
| 5 | 收敛第 4 条 | 私有变量位于 SHARED TOKENS **END 之后**的位置断言，以及改位后重跑 `sync_tokens.js --check` |
| 6 | P1-4 | QA 给出的 5 条任务反例（正确今日完成 = 2）单独跑一遍 |
| 7 | P2-8 | `.foot` 新文案的落地断言 |
| 8 | 全部追加项 | 追加项落地后的回归：五 HTML 分块 `node --check`、NAV/SHARED 一致性（含 index.html）、`sync --check`、harness 52/52、390px P0 断言、console/errors |

## 9. 未验证项 / 环境限制

1. **主理人已接手源码**：本成员自最后一条指令起未再写 `home.html`、`书影音海报墙.html`、`_shared/inject_shared.py`、`sync_tokens.js`，也未对主理人此后的任何改动做核验；本文件所有 PASS 只对 19:55 同步后的文件状态有效。
2. 19:55 同步时 `home.html` 被他人改写 3 处（`doneOnDate` 版 `summaryTasks`、`.foot` 文案、陈旧注释）。主理人第 3 条已确认前两项正是 P1-4 / P2-8 要求；陈旧注释仍待处理。详见 `change-log.md` §2。
3. 主理人最后一条消息把「海报墙 avg 归一」列为本成员已完成项 —— **更正：本成员从未改海报墙任何 JS，也未验证评分归一**，见 `change-log.md` §2。
4. 未推送线上 / 未部署 / 未提交 git；线上仍是改造前状态。
5. 未在真实手机设备测试；390×844、1024×768、768×900 均为桌面 Chromium 视口模拟。
6. 未对 1731 条 MEDIA 数据逐条核对；海报墙功能以 52 项回归 + 局部渲染探针覆盖。
7. 浏览器 localStorage 含此前审查遗留键值，本成员只读未写业务数据；主题切换/刷新按钮点击只写主题键与缓存键（页面既有行为），并已回置 dark。
8. `sync_tokens.js --check` 对无标记区文件误报 IN_SYNC(NO_MARKERS) 且 exit=0，是脚本既有缺陷，本轮未改（不在允许写入范围）。
9. `site-nav.js` 内部注释仍写「三页」，按禁止清单未改。
10. 1440 下海报墙内容左边界实测 51px（经典滚动条），无滚动条时为 58px；与明信片的 7px 差值来自滚动条占宽，非容器宽度。
11. `agent-browser` daemon 被多成员共享，默认会话有竞态；本成员结论均来自命名会话 `dev1104`（已 close）。

## 10. 启动方式（真实，无构建）

四个 HTML 均为零依赖单文件：双击 `home.html`（或任一页）用浏览器打开即可；`file://` 下 Service Worker 静默跳过，主题/摘要走本机 localStorage。经 HTTP 静态服务打开时，`sw.js` 由内联 SITE-NAV 幂等注册。
