# 四页站点全量审查 + 门户页 UI 优化 · 交付说明（草稿，成员结论待并入）

## 0. 结论摘要
四页同站点的基础已具备（同源、统一 PWA、统一导航条三页已注入、共享 token 三页 IN_SYNC），但**门户首页没有接入站点导航体系**，且存在一处**窄屏不可用**的实测缺陷。视觉协调性问题的主因不是单一容器宽度：容器宽度解释「左右边界不对齐」，卡片形态/密度/圆角/色相解释「看起来不是一套设计」。

## 1. 专项判定：海报墙的视觉差异是否由容器宽度导致
1440×900 真实 computed style：

| 页面 | .wrap max-width | 内容区宽 | 内容左边界 | 品牌栏左边界 | body 字号 | 主内容形态 |
|---|---|---|---|---|---|---|
| 任务管理台 | 1360px | 1332 | x=47 | x=47 | 15px | 全宽面板 / 表格 |
| 明信片追踪 | 1360px | 1324 | x=58 | x=58 | 15px | 全宽面板 / 表格 |
| 书影音海报墙 | **1240px** | **1192** | **x=117** | **x=117** | 15px | **8 列海报栅格，卡宽 139px** |
| 门户 home.html | **960px** | 960 | x=240 | x=240 | **16px** | 3 列入口卡，卡宽 309px |

**判定：部分由容器宽度导致，但它不是「整体不协调」的主因。**
- 容器宽度是「对齐/跳动」的直接原因：海报墙比另两页窄 140px（约 10.5%），品牌 logo 与分区标题右移约 70px；从任务台点「海报墙」时，顶栏品牌与内容边缘肉眼可见地缩进一格。门户页 960px 又比三页窄 400px，形成第三套边界。
- 但更强烈的差异来自四类非宽度因素：① 8 列 139px 密集海报栅格 vs 另两页全宽面板（信息密度与阅读节奏完全不同，这是内容形态决定的，合理且应保留）；② 圆角 10/12px vs 16px；③ 海报墙 logo/主按钮紫粉色相 vs 另两页蓝色 `var(--pri)`；④ 统计卡 3 张 12px 圆角/16px 内边距 vs 明信片 7 张小卡。
- 因此修改策略：**统一容器宽度与基础 token（低成本、立刻消除跳动），但保留海报墙的密集栅格与品牌色作为内容个性**，不强行把海报墙改成面板式布局。

## 2. 已审查范围
- 页面：`home.html`、`任务管理台.html`、`明信片追踪.html`、`书影音海报墙.html`、`index.html`（任务台副本）
- 共享层：`_shared/site-nav.js`、`_shared/shared.js`、`_shared/inject_shared.py`、`design_tokens.css`、`sync_tokens.js`、`manifest.json`、`manifest-postcard.json`、`sw.js`
- 代码：四页 CSS 布局规则、门户摘要 JS 全文、导航模块、状态枚举、主题键、PWA 清单；海报墙分析/画像/筛选/分页逻辑此前已审查，本轮抽查口径
- 实测：1440×900 / 1024×768 / 390×844 三档真实浏览器 computed style + 截图；亮色/暗色；线上四页 MD5 与本地一致
- 基线回归：`node /tmp/harness.js` 52/52、`verify_partial.js` 通过、`sync_tokens.js --check` 三页 IN_SYNC

## 3. 问题清单（按优先级）

### P0（立即修改）

**P0-1｜书影音海报墙 / 顶部吸顶工具栏（≤560px）**
- 当前表现：390px 下 `document.documentElement.scrollWidth=471 > 390`，`.viewtabs` right=471、`#vStats` left=376 被推出视口；搜索框被「新增条目」按钮压住（截图 `/tmp/review_shots/mobile/书影音海报墙.png`）。根因 `@media(max-width:560px){.toolbar{flex-wrap:nowrap}}` 与 `.viewtabs{flex:none;margin-left:auto}` 叠加，同行塞了搜索+新增+导出+导入+两个视图 tab。
- 影响：手机上「汇总分析」入口完全不可达、搜索框不可用，属功能缺失。
- 建议：≤560px 让 `.toolbar` 允许换行并把 `.viewtabs` 单独放到第二行（`order` + `width:100%` + `justify-content:center`），保留原「吸顶栏不过高」约束（只增加约 44px）；或把导出/导入收进溢出菜单。改后断言 `scrollWidth<=innerWidth` 且 `#vStats.getBoundingClientRect().right<=innerWidth`。
- 是否立即修改：**是**（已复现）

**P0-2｜门户 home.html / 站点导航**
- 当前表现：`home.html` 没有 `__wsn_bar`，因为 `inject_shared.py` 的 SITE-NAV targets 只有三页；作为站点中枢却只有一条 `.navlinks` pills 行，且该行与「统一导航条」「三张卡片」形成三层重复跳转。
- 影响：从门户进入子页后无法一眼确认站点结构，门户自身也没有品牌/当前页态；「一个主页的不同页面」的观感被打断。
- 建议：把 `home.html` 加入 SITE-NAV targets 并插入标记块，`site-nav.js` 的 `currentPage()` 已支持 home（会高亮「首页」）；随后删除或弱化冗余 `.navlinks`；注入后跑逐字节一致性断言。
- 是否立即修改：**是**（静态已确认）

### P1（本轮一并处理）

**P1-1｜门户摘要 / 业务逻辑口径（2 处）**
- 当前表现：① `summaryTasks()` 把 `status==="done"` 的任何历史完成任务都算进「今日完成」；② `summaryPostcards()` 的「在途」只数 `postcards[].status==="transit"`，却把整个 `received` 数组都算进「已到达」，而明信片页 `RECV_STATUS_ORDER=["transit","received"]`，received 里 transit 应算在途、只有 received 算已收。
- 影响：门户首页三个指标常年偏高/偏低，用户会误判进度。
- 建议：今日完成改为 `doneDates.some(d => String(d).slice(0,10)===today)`（并考虑周期任务当前周期口径）；在途 = postcards.transit + received.transit，已到达 = postcards.arrived + received.received，标签与明信片页保持一致。
- 是否立即修改：**是**

**P1-2｜门户 home.html / 设计基线与 token 双源**
- 当前表现：门户 CSS 变量手写、`--radius:16px` vs 共享 `12px`、body 16px vs 三页 15px；门户不在 `sync_tokens.js` TARGETS，不在 SHARED TOKENS 标记体系。海报墙虽已接入共享块，但源码里仍保留一套旧的 `:root`（`#F8FAFC/#1f2328/#e6e9ef`）被末尾共享块覆盖，属双源隐患。
- 影响：以后改主色/圆角只需改一处却会漏掉门户；海报墙维护者容易改错那一套。
- 建议：门户加 SHARED TOKENS 标记区并纳入 `sync_tokens.js`，统一 `--radius`、字号；海报墙旧 `:root` 收敛为只保留私有变量（`--pink/--amber/--purple/--ink-soft`），公共变量只由共享块提供。
- 是否立即修改：**是**

**P1-3｜容器宽度与视觉对齐（用户重点项）**
- 当前表现：四页三套宽度（1360/1240/960），见第 1 节表。
- 影响：切页时版面跳动；门户 960px 在 1440 屏上留白过大，首屏内容只占上方约 400px，下方约 400px 空白。
- 建议：门户统一到 1360（或折中 1200 作为「门户比工具页窄」的有意层级），海报墙 `.wrap` 改 1360 并同步调整 `subtype` 断点（否则 8 列卡片从 139px 涨到约 154px，标题截断风险上升）；若决定保留 1240 须在文档中写明理由。同时统一卡片圆角/阴影与统计卡节奏。
- 是否立即修改：**是**（宽度与首屏节奏）；海报墙列数是否随之调整由设计规范定

**P1-4｜门户 home.html / 暗色主题与视觉完成度**
- 当前表现：三个图标底色硬编码亮色（`#eaf0ff/#fdeaf1/#f0eafe`），暗色下形成刺眼亮块；`.go` 用 `--pri-deep` 在暗底对比度偏低；首屏无站点身份（无 logo/无导航条），指标降级时大片「—」。
- 影响：暗色模式观感粗糙，也是用户「还不是很好看」的主要来源。
- 建议：图标底色改主题变量（亮/暗两套），链接用 `--pri-ink`/亮色专用高对比值；补品牌区、层次化留白、页脚信息；空态给明确说明而非裸「—」。
- 是否立即修改：**是**

### P2（可延后，登记挂账）

| 编号 | 模块/位置 | 当前表现 | 影响 | 建议 | 立即 |
|---|---|---|---|---|---|
| P2-1 | 四页主题键 | 门户 `wb_workbench_theme`、任务台 `wb_taskhub_theme_v1`、明信片 `wb_postcards_theme`、海报墙仅 `wb_theme_v1`，各有私有键 + 公共键 | 私有键优先时门户切换主题可能不同步到三页 | 统一只读/只写 `wb_theme_v1`，私有键留作兼容读 | 否 |
| P2-2 | 门户 `fetchMediaCount` | 用正则数 `{"title":` 得静态 1731，不含 `wb_mediawall_custom_v1`；「已记录」与「自定义条目」并列 | 数字含义模糊，新增条目后「已记录」不变 | 由海报墙写 stats 时合并自定义条目数，或把标签改成「导入记录」 | 否 |
| P2-3 | 门户交互冗余 | 导航条 + `.navlinks` + 三张卡片三层跳转 | 首屏信息重复 | 删 `.navlinks` 或改为「最近访问/说明」 | 否 |
| P2-4 | 门户 560–820px | `.grid` 变 2 列，第三张卡单独半宽一行 | 中屏布局不平衡 | 该区间直接单列，或三卡等高两列 + 第三张跨列 | 否 |
| P2-5 | `sw.js` 离线策略 | navigate 失败一律回 `home.html`；海报图片（1728 张）不进缓存 | 离线打开工具页会被门户替换，海报全空 | 按请求 URL 回对应缓存页；海报图走 CacheFirst 或明确标注「离线仅门户可用」 | 否 |
| P2-6 | 海报墙品牌色 | logo/主按钮紫粉，另两页蓝 | 色相不统一（属内容个性，可保留） | 只统一「导航/选中态/链接」用 `--pri`，品牌紫保留为海报墙识别色 | 否 |
| P2-7 | 海报墙统计卡 | 3 张 12px 圆角/16px padding，明信片 7 张小卡 | 跨页节奏不同 | 统一为 `--radius-lg` + 同一 padding 档，不强求卡数一致 | 否 |

## 4. 已确认无明显问题的部分
- 三页统一导航条：同标签跳转、当前页高亮、亮暗跟随、非吸顶不与 sticky 抢位，1440/390 实测正常。
- PWA：三页统一 `manifest.json`（start_url=home.html + 3 个 shortcuts）、`sw.js` v2 预缓存门户+三页、幂等注册与 `file://` 守卫；`manifest-postcard.json` 保留兼容。
- 工程契约：SHARED 铁律遵守（海报墙未被注入 shared.js，避免 6 处同名声明冲突）；NAV/SHARED 内联块与源文件逐字节一致；`index.html` 与任务台逐字节一致；`sync_tokens.js --check` 三页 IN_SYNC；线上四页 MD5 与本地一致。
- 海报墙功能：52 项回归 + 局部渲染探针通过；排序/筛选/搜索/分页/弹窗导航/心愿单/兴趣画像/URL hash 保态链路在此前一轮已实测，本轮抽查无回归。
- 1024px 中屏：门户 3 列整齐、海报墙 7 列整齐，四页均无横向溢出（390px 的海报墙问题除外）。
- 安全：海报图 `onerror` 已转义、用户输入走 `esc()`、无密钥进前端。

## 5. 本轮实现与验证

> 时点说明：第 1–4 节是审查阶段（改前）的发现快照，其中 P2 方向与建议以改前代码为准；第 5 节及用户报告 `Projects/站点统一_全量审查报告_20261104.md` 第七节为最终落地与验证结论，冲突时以后者为准。另：门户私有变量写在 SHARED TOKENS **START 之前**，经设计成员复核确认符合「标记区之外」不变量（START 之前与 END 之后均合法），**P2-13 已撤销为问题**，无需改动；`design/spec.md` 断点建议值与实现不同属主理人已定取舍，spec 不改。

**核心验收达成。** P0-1 / P0-2、P1-1~P1-7 全部落地，另顺手修 4 处低成本 P2；详细执行表见用户报告 `Projects/站点统一_全量审查报告_20261104.md` 第七节。

- 实现：门户接入 SITE-NAV + SHARED TOKENS、容器 1360、body 15px / radius 12、亮暗图标变量、品牌 logo + 本机数据概览卡、降级文案纠正；海报墙容器 1360 + padding 18、390px 工具栏重排、logo/CTA 蓝系、`.pcard` 圆角 token、avg/TOP12 归一；门户摘要三处口径修正；`inject_shared.py` 补 home/index targets 且失败非零退出；`sync_tokens.js` TARGETS 四页 + NO_MARKERS 修正。
- 静态：五页分块 `node --check`、sw.js、两个 manifest JSON 全绿；NAV/SHARED 内联块与源文件逐字节一致（含 home/index）；`index.html ≡ 任务管理台.html`；`sync_tokens.js --check` 四页 IN_SYNC；仓库克隆与 vault 四页 MD5 一致。
- 回归：`harness.js` 52/52、`verify_partial.js` 局部渲染探针通过。
- 浏览器：1440px 四页导航高亮正确、内容左边界 47/58/51/58（改前 47/58/117/240）；390px 四页 `scrollWidth=375 ≤ 390` 零溢出，海报墙 `#vStats` right=281、搜索框 88px；门户亮/暗主题图标与链接对比度达标；分析页平均评分 8.0、TOP12 归一、画像存在、无 NaN。
- 视觉复核中修正一处自引入缺陷：门户 `.grid` 曾设 `max-width:1120px;margin:0 auto` 导致卡片区与品牌区不对齐，已去掉内缩，全部区块左边界 x=58。

## 6. 最终发布状态 / 未验证项 / 限制
- **已上线**（用户选定「等复核后上线」）：commit `952db20` 推到 `main`，Pages 构建完成后线上五页 MD5 与本地 **5/5 MATCH**，并补做 https 门户冒烟（导航条、首页高亮、概览卡 4 格、小字对比度 5.216、无溢出、manifest/SW 可用）。
- 独立测试成员的改后复核 `qa/recheck.md` **已完成且无 P0/P1 残留**，但其 PASS 严格对应冻结快照 `home.html=f7e83df…`。唯一新增 P2（概览卡小字亮色 4.471）随后由主理人用私有变量 `--ov-sub` 修到 5.216(亮)/6.201(暗)，`home.html` 最终 MD5 `b1ddc8ea61a5190f7a0a61f6504f6e0e`；**该 delta 未经独立复核重判**，只做了主理人复验（语法 / 52/52 / token IN_SYNC / 亮暗 computed style / https 冒烟）。主理人判断单一 CSS 颜色变量无需另派完整独立 QC，此边界不写成「独立复核通过」。详见用户报告 7.2–7.4。
- 测试成员最终回执另附产物：`qa/findings.md`（改前基线 273 行）、`qa/test-plan.md`（519 行）、`qa/recheck.md`（349 行，含附录 A 催办补充复核）、`qa/evidence/` 与 `qa/evidence/recheck/`（24 个文件、4 张截图）。
- 未在真实手机设备测试，窄屏结论来自 390×844 桌面视口模拟；1024/768 暗色全量对比度未测。
- 未对 1731 条 MEDIA 数据逐条业务核对；画像与统计口径为抽查 + QA 受控 fixtures。
- 未验证：https 环境 PWA 安装与 SW 离线兜底、IO 哨兵自动翻页、Gist 云同步、Safari/Firefox、真机触控。
- 挂账未改：主题私有键分歧（三页→门户主题不同步仍复现）、媒体计数文案与 `file://` 死代码、离线策略、心愿单完成日期、genre 空值、海报墙双 `:root`、任务台运行时 manifest、PWA PRECACHE 缺 3 项。
- `deliverables/`（42 文件 / 1.4MB）与用户报告副本**已按用户要求全部提交到 GitHub**（`952db20` 之后的补充提交）。⚠️ 这是公开 Pages 站点，`deliverables/` 不以 `_` 开头 → 文档与截图公开可访问；提交前已扫描无凭证/邮箱/真实业务数据，仅保留 88 处本机绝对路径作为 QA 命令证据。用户可见结论仍以 vault 主副本 `Projects/站点统一_全量审查报告_20261104.md` 为准。
- 启动方式：线上直接访问 `https://chy15164971.github.io/tools/home.html`；本地双击 `Projects/home.html`（`file://` 域与 https 域 localStorage 不互通，门户摘要显示「—」属正常降级）。
