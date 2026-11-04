# 站点 UI 视觉审查 + 门户页优化规范 · site-ui-review-1104

> 产物类型：**设计规范 / 审查结论**（不是可运行应用，不是成品源码）
> 唯一可写路径：本文。本次**未修改任何应用源码、共享脚本、token 源、数据体**。
> 输入版本：`87d8ba6`（站点统一改造）工作副本 `/tmp/toolsrepo2/`
> 依据：`brief.md`（含主理人 1440×900 真实量测表）、`acceptance.md`、四页源码、四张 1440×900 亮色首屏截图、共享 token 源、`_shared/site-nav.js`、`_shared/inject_shared.py`、`_ops/_workbench/sync_tokens.js`
> 复核方法：逐行读取四页 `<style>` 与结构 + 四张截图可见外观 + 源码 CSS 反推量测值（**8 项反推值与 brief 量测表逐项吻合**，见 §2.1）
> 未执行：未用 agent-browser 重新渲染、未跑 harness / 浏览器冒烟、未渲染本文提出的建议方案 → **建议方案的最终视觉效果需开发实现后由 QA 复核，本文不声称视觉检查通过**

---

## 0. 结论先行

**「书影音海报墙与任务台/明信片追踪的视觉差异是否由容器宽度导致？」→ 否，容器宽度不是主因，量化估计仅占约 7%。**

容器宽度只能解释「左右各多出约 59–70px 留白」这一项（内容宽 1192 vs 1332/1324，差 −140/−132px，约 −10.5%）。真正造成「像另一个站点」的是两项主因：**① 8 列 139px 小海报网格 vs 全宽面板（约 40%）**；**② 紫色 logo + 粉紫主按钮 vs 蓝色品牌（约 22%）**。圆角、字号、密度为次要成因。仅把 `.wrap` 改到 1360px 而保留 8 列 / 紫色 / 10px 圆角 / 小字号，卡片只从 139px 变 154px（+11%），页面观感几乎不变。

**因此本轮建议：不改海报墙 `.wrap`（保留 1240px），把改造资源放在首页 UI 优化与品牌色相/圆角 token 对齐上。**

### 建议立即改（随本轮一起做，全部落在 home.html + 接入配置）

| # | 项 | 对应验收 |
|---|---|---|
| 1 | home 接入统一站点导航条（加 SITE-NAV 标记块 + 把 home.html 加进 `inject_shared.py` 的 SITE-NAV targets） | B1 |
| 2 | `body{padding:0}`、padding 下移到 `.wrap`，保证导航条全宽不内缩 | B1 / B6 |
| 3 | 首页首屏重构：品牌 hero（44px 蓝色 logo）+ 容器 1200px + 卡片 min-height 360px + 底部 flex 吸附页脚 | B2 / B6 |
| 4 | 接入 SHARED TOKENS 体系（`--radius` 12 / `--radius-lg` 16 三档），body 对齐 15px/1.5；`--shadow-hover` 移到 END 标记之后 | B3 |
| 5 | 图标色改成带暗色变体的 CSS 变量，去掉 inline `style=` 硬编码浅底 | B1 暗色 / B3 |
| 6 | 保留全部 8 个指标 ID / 3 张卡 / 2 个按钮 / `id="origin"` / 数据说明原文，降级态 `—` 表达强化 | B4 / B5 |

### 可延后（不阻塞本轮验收）

| # | 项 |
|---|---|
| 7 | 海报墙 logo 渐变 `#a855f7` → `#7aa0ff`；主 CTA `linear-gradient(120deg,#a855f7,#ec4899)` → `var(--pri-deep)` 蓝系 |
| 8 | 海报墙 `.pcard{border-radius:10px}` 等 10/12/14/18px 硬编码圆角收敛到 `--radius-sm/--radius/--radius-lg` |
| 9 | 海报墙 `.wrap` 1240 → 1360（**本轮不建议**，推演见 §3） |
| 10 | home 增加 skip-link、数字 `tabular-nums`、`.navlinks` 是否在桌面隐藏（需主理人定） |

---

## 1. 审查范围与已确认事项

**已审范围（视觉维度）**：`home.html`、`任务管理台.html`、`明信片追踪.html`、`书影音海报墙.html` 的 `<style>` 全量 CSS 变量与版式规则、四页 1440×900 亮色首屏截图、`_shared/site-nav.js` 注入样式、`_shared/inject_shared.py` 目标列表、`_ops/_workbench/design_tokens.css` 与 `sync_tokens.js` TARGETS、`/tmp/harness.js` 与 `/tmp/verify_partial.js` 的断言类型。

**已确认无明显问题的部分**
- 三页（任务台 / 明信片 / 海报墙）的 `:root` 与 `[data-theme="dark"]` 已与 `design_tokens.css` 完全一致（SHARED TOKENS 标记区内），`--radius:12px / --radius-sm:8px / --radius-lg:16px / --shadow` 三页同源。
- 三页均含 SITE-NAV 内联块（各约 20 处 `wsn` 标识），`__wsn_bar` 全宽、亮暗主题变量齐全、`aria-current="page"` 高亮、同标签跳转、`overflow-x:auto` 窄屏可滚动，四张截图中可见且一致。
- 海报墙 `.subtype` 的 1200/900/680/460 断点是**视口宽度**断点，与 `.wrap` 宽度无关，改容器宽度不会触发列数跳变。
- `home.html` 已具备 `:focus-visible`（按钮 / 卡片 / 导航链接）与 `@media(prefers-reduced-motion:reduce)`，B7 基础已在，只需扩展覆盖。
- `.pcard .name`（2 行 `-webkit-line-clamp`）、`.meta` / `.gtag`（`text-overflow:ellipsis`）、`.crow{min-width:0}` 都是宽度无关的截断方案，**任何列宽下都不会文字溢出**。
- `/tmp/harness.js`（53 处 check）与 `/tmp/verify_partial.js` 是 DOM 桩 + JS 逻辑断言，`includes()` 全部针对 `innerHTML/textContent` 内容，**未发现任何 max-width / 1240 / 1360 / border-radius / getBoundingClientRect / offsetWidth / offsetLeft 等 CSS 或几何断言**（已 grep 复核）。纯 CSS 改宽度不会触发这 52 项回归失败。

**明确不算缺陷（避免把风格偏好写成问题）**
- 海报墙 `.section-title` 左框 `--pink/--amber/--purple`、`TYPE_META` 各类渐变、`.gtag` 蓝标签：这是「已看/已读/已听」与题材的**语义分类色**，有信息功能，不建议改，也不列入问题清单。
- 明信片追踪截图首屏下半部也有大片空白，但那是**空数据态**（已有「还没有寄出记录」空状态卡），属合法状态，不是布局缺陷。
- home 的胶囊按钮 `border-radius:999px` 与 `__wsn_links a` / `.chip` / `.vtab` 的 pill 语言一致，属全站既有视觉语言，不算 token 冲突。

---

## 2. 全站视觉一致性审查结论

### 2.1 四页基线对照（1440×900 亮色）

「量测」列来自 brief 的真实浏览器 computed style；「源码复核」列为我逐行读取 CSS 后的取值/反推，两者逐项吻合。

| 页 | `.wrap` (源码) | 内容宽 | 左边距 x | body 字号 | 首屏首个卡片 | 栅格 / 布局模型 |
|---|---|---|---|---|---|---|
| home.html | `max-width:960px;margin:0 auto`（body `padding:28px 20px`） | 960 | 240 | **16px / 1.6**（默认） | **309×293 / radius16 / pad20** | 3 列 `gap16` |
| 任务管理台 | `max-width:1360px;padding:14px 14px 0` | 1332 | 47 | 15px / 1.5 | 面板 `var(--radius-lg)`=16 / pad14 | 全宽面板式 |
| 明信片追踪 | `max-width:1360px;padding:14px 18px 0` | 1324 | 58 | 15px / 1.5 | 面板 16 / pad14 | 全宽面板式 |
| 书影音海报墙 | **`max-width:1240px;padding:0 24px`** | **1192** | **117** | 15px / 1.5 | **pcard 139×293 / radius10 (硬编码)** | **8 列 `gap:16px 12px`** |

**反推校验（全部与 brief 一致，证明 CSS 模型正确）**
```
home 卡片 : (960 − 2×16) / 3            = 309.3 → 309
海报卡片  : (1192 − 7×12) / 8           = 138.5 → 139   （.subtype 列间距 12px）
home x    : 20 + (1400 − 960)/2         = 240
任务台 x  : (1426 − 1360)/2 + 14        = 47    （有垂直滚动条，视口 1426）
明信片 x  : (1440 − 1360)/2 + 18        = 58    （首屏无滚动条）
海报墙 x  : (1426 − 1240)/2 + 24        = 117
```

**其它可观察差异（源码 + 截图）**

| 维度 | home | 任务台 / 明信片 | 海报墙 |
|---|---|---|---|
| 统一导航条 | **无**（`wsn` 出现 0 次，不在 SITE-NAV targets） | 有，全宽，高 ≈43px | 有，全宽，高 ≈43px |
| 品牌标识 | **无 logo，仅文字「工作台」** | 30px 蓝色渐变 logo `linear-gradient(135deg,var(--pri),#7aa0ff)` | 30px **紫色**渐变 logo `…,#a855f7)` |
| 主操作色 | 按钮为中性白底 | 蓝 `var(--pri-deep)` / `var(--pri)` | **粉紫** `linear-gradient(120deg,#a855f7,#ec4899)`（新增条目 / 保存）；搜索高亮 `rgba(168,85,247,…)` |
| 圆角来源 | 单值 `--radius:16px`（与共享 12px 冲突） | 面板 `var(--radius-lg)`=16px | pcard **硬编码 10px**、stats/ana 12px、prof 14px、modal 18px、`--radius`=12px 仅用于部分组件 |
| 卡片比例 | 309×293 ≈ 1.05:1（近方） | 面板 ≈1332 宽 × 200 高 ≈ 6.6:1 | 139×293 ≈ **1:2.1**（封面固定 `aspect-ratio:2/3`） |
| 卡片内文字 | 17px 标题 / 12.5px 描述 / 22px 指标 / 11.5px 标签 | 15px 正文 / 15px 条目 / 24px 统计数字 | **12px 名称 / 10.5px meta·星级 / 10px badge·gtag / 13px 占位封面字** |
| 间距节奏 | gap16 / 卡内 pad20 / 指标区 12px 上下 padding | 面板 pad14 / margin-bottom14 | **列 gap12、行 gap16**，节标题 `margin:26px 4px 14px`，子标题 14/9px，题材标签 12/9px |
| 密度 | 3 张卡 | 面板/日历/表格 | **8 列 × 48 条/页 ≈ 6 行**，1731 条 MEDIA，`body.dense` 可到 10 列 |
| 排版节奏 | h1 26 → 卡标题 17 → desc 12.5 → 指标 22 → 标签 11.5 | brand 18 → 15 正文 → 24 统计 | section 17 → sub 13 → genre 11 → 卡名 12 → meta 10.5（**五级紧节奏**） |
| 对齐 | 内容区 x=240，顶部无全宽元素，左上角空 | 顶栏全宽、内容 x=47/58 | 顶栏 + 导航条全宽、内容 x=117 |

### 2.2 「是否由容器宽度导致」——明确回答

**否。容器宽度是次要成因，不是主因，量化估计约占视觉差异的 7%。**

可量化的部分只有留白：
- 内容宽 1192 vs 1332（任务台）/ 1324（明信片）= **−140 / −132px，约 −10.5%**；
- 1440 下单侧左边距 x=117 vs 47 / 58 → **每侧多约 59–70px**；
- 全站并存三档宽度：960（home）/ 1240（海报墙）/ 1360（任务台·明信片）。

**反证（关键）**：假设只把 `.wrap` 改成 1360px，其余一律不动：
- 卡片 `139 → 154px`（+15px，+11%）；
- 8 列不变、紫色 logo/CTA 不变、pcard 10px 圆角不变、12px/10.5px 小字不变、12/16px 密度不变；
- 页面仍是「窄边留白 + 8 列小海报 + 紫粉主色」的密集画廊，与两张全宽蓝色面板页观感依旧截然不同。

**列数对卡片尺寸的影响是容器宽度的约 3 倍**：同样 1192 内容宽下，8 列 → 139px，改成 6 列 → `(1192−5×12)/6 = 188.7px`（+36%）；而容器宽度从 1240→1360 只带来 +11%。更本质的是**布局模型不同**：另两页是 1332px 全宽面板，海报墙是 139px 海报卡，二者相差近 10 倍，这个差距与容器宽度无关。

> 补充：若把 padding 提到 84px 让 `max-width:1360px` 的内容宽仍等于 1192px，则左边距仍是 x=117，**视觉上零改善**，属于「改数字不改观感」，不推荐。

### 2.3 成因拆解（占比 = 基于可量化幅度 + 视觉权重的工程估计，用于排改造优先级，非仪器测量值）

| 成因 | 量化依据 | 估计占比 | 主因判定 |
|---|---|---|---|
| **列数与卡片尺寸 / 布局模型** | 8 列×139px 海报（1:2.1）vs 1332px 全宽面板（6.6:1）；6 列可到 189px（±36%），远大于宽度带来的 +11% | **≈40%** | ✅ **主因①** |
| **色相与品牌** | logo `#a855f7` 紫 vs `#7aa0ff` 蓝；主 CTA `#a855f7→#ec4899` 粉紫 vs 蓝 `var(--pri-deep)`；搜索横幅/mark 也用紫。首屏第一个色块与主按钮颜色，跨页识别最强 | **≈22%** | ✅ **主因②** |
| **密度** | 8 列 48 条/页、gap 12/16px、1731 条、dense 10 列；对比面板页 14px pad + 大面板 + 7 张统计卡 | ≈13% | 次要（与①耦合） |
| **字号** | 卡名 12px / meta 10.5px / badge 10px vs 面板页 15px 正文、15px 条目（−20%） | ≈10% | 次要 |
| **圆角** | pcard 硬编码 10px + 12/14/18px 混用 vs 面板统一 `var(--radius-lg)`=16px | ≈8% | 次要 |
| **容器宽度** | 1240(内容1192) vs 1360(1332/1324)，−10.5%；左边距 +59~70px/侧 | **≈7%** | ❌ **非主因** |

**结论表述建议（可直接用于报告）**：三页共享同一套 token、同一导航条、同一 15px 基线，品牌与结构是统一的；海报墙的「不像同一站点」主要来自**它是一个 8 列海报画廊**（布局模型 + 卡片比例 + 密度 + 小字号），其次来自**紫色品牌/粉紫主按钮**，这两项合计约 62%；容器宽度只贡献约 7% 的额外留白，改宽度是低收益动作。

---

## 3. 海报墙 `.wrap` 1240 → 1360：量化推演、风险与建议

### 3.1 推演（保持 8 列、`gap:16px 12px`、现有圆角/配色/字号不变）

设 `.wrap{max-width:1360px;padding:0 24px}`（最小改动，沿用海报墙自己的 24px padding）：

| 量 | 现在 1240 | 改后 1360 | 变化 |
|---|---|---|---|
| 内容宽 | 1192 | **1312** | +120 |
| 左边距 x（1440 有滚动条） | 117 | **57** | −60 → 与明信片 58 / 任务台 47 对齐 ✅ |
| 单张 pcard 宽 `(W−7×12)/8` | **138.5 ≈139** | **153.5 ≈154** | **+15px / +11%** |
| 封面高 `width×1.5`（`aspect-ratio:2/3`） | 208.5 | **231** | +22.5 |
| 卡片总高（信息区 ≈84px 不变） | ≈293 | **≈315** | +22 |
| `.stats` 单卡 `(W−32)/3` | 386.7 | **426.7** | +40 |
| `.ana-grid`（`auto-fit minmax(190px,1fr)` gap14） | **5 列** | **6 列** | 分析页每行多 1 张 |
| `.prof-grid`（`auto-fill minmax(270px,1fr)` gap12） | 4 列 | 4 列 | 不变 |
| `body.dense` 10 列单卡 `(W−9×12)/10` | 108.4 | **120.4** | +12 |
| `.subtype` 列数 @1440 | 8 | 8 | 不变（断点是视口宽度，非容器） |

若 padding 与兄弟页对齐：18px → 内容 1324 → 卡 **155px**；14px → 内容 1332 → 卡 **156px**。即无论怎么对齐，结论都是 **154–156px**。

**标题是否溢出？→ 不会。**
`.pcard .name{font-size:12px;-webkit-line-clamp:2;overflow:hidden}` 是 2 行截断（非 nowrap），`.meta` / `.gtag` / `.crow` 均为 `white-space:nowrap;text-overflow:ellipsis;min-width:0;max-width:100%`，三者都是**宽度无关**的截断方案。变宽只会让单行容纳更多字符、减少省略号，不产生溢出；`.pcard{overflow:hidden}` 再兜一层。唯一几何变化是封面变高 22px → 卡片变高约 22px → 每组 48 条（6 行）整组高约 +132px，墙更长、滚动更多。

### 3.2 风险

1. **收益低**：只解决 7% 的成因，8 列 / 紫粉 / 10px 圆角 / 小字全留着，观感几乎不变。
2. **卡片变大会改变海报墙的性格**：154px 海报 + 231px 封面，介于「缩略图墙」与「大图墙」之间；暗色/亮色下需重新看图密度是否舒服。
3. **分析页布局变化**：`.ana-grid` 5 列→6 列，统计卡排布与视觉节奏改变，需重新目检（C1「统计卡不错位」）。
4. **分组分页观感**：`GROUP_PAGE_SIZE=48` 不变，但每组多 +132px 高度；dense 模式 10 列卡从 108→120px。
5. **回归面**：已复核 `/tmp/harness.js`、`/tmp/verify_partial.js` **无 CSS/几何断言**，纯 CSS 改宽度不会触发 52 项失败；但 C2 / D5 要求「不破坏海报墙 52 项回归 + 浏览器冒烟」，仍需 QA 实跑确认，本文不代跑、不代称通过。
6. **一致性反噬**：改后内容宽 1312 与任务台 1332 / 明信片 1324 仍差 12–20px，名义对齐但内容宽仍不对齐；若要完全对齐需统一 padding，会牵动另两页（本轮范围外）。

### 3.3 建议：**本轮不改，保留 1240px**

理由：C1 允许「给出不改的量化理由」——容器宽度仅占约 7% 差异、改动收益 −11% 卡片变化却带来 +22px 卡高 / 分析页 5→6 列 / dense 卡变化 / 需全量回归，投入产出不划算；且 home 的 960px 与三页 1360px 的落差（x=240 vs 47/58）比海报墙这 120px 更影响站点整体观感，优先级应让给首页。

**替代方案（按推荐度排序，供主理人选择）**

| 方案 | 内容 | 效果 | 代价 |
|---|---|---|---|
| **C（推荐）保留 1240，只统一其它 token** | 改 logo 渐变 `#a855f7→#7aa0ff`、主 CTA 紫粉→`var(--pri-deep)` 蓝系、pcard `10px→var(--radius-sm)` 或 `var(--radius)`、stats/ana/prof/modal 圆角收敛到三档 token；**语义分类色保留** | 消除约 22%+8% 的主因②与圆角差异，零布局变化、零回归风险 | 需处理暗色下紫→蓝的可读性；CSS-only |
| **A 统一 1360，列数不动** | `.wrap{max-width:1360px;padding:0 24px}` → 卡 154px | 左边距对齐（x=57），卡 +11% | 卡高 +22px、分析页 5→6 列、dense 卡 120px、需 QA 全量回归 |
| **B 统一 1360 并调整列数保持密度** | 1360 + 9 列 `gap:16px 12px` → `(1312−8×12)/9 = 135px`（≈现 139px，−3%）；断点同步 7→8 @1200、6→7 @900、4→5 @680、3→4 @460，dense 10→11 | 名义宽度对齐且密度几乎不变 | 改动面最大（断点 + dense + 分页观感），回归面最大；`GROUP_PAGE_SIZE=48` 下 9 列 = 5.33 行/页，需目检 |
| D（不推荐）padding 84px 名义对齐 | `max-width:1360px;padding:0 84px` → 内容仍 1192、x 仍 117 | **视觉零变化**，仅数字好看 | 无意义，不采用 |

---

## 4. `home.html` UI 优化规范（开发者按数值实现即可）

> 本节是**样式与结构规范取值**，不是可直接替换的成品 HTML。不得新增页面、不接后端、不改业务逻辑、不改 MEDIA 数据体、不改 `index.html`。

### 4.1 页面结构与文案

**文字线框（1440×900 亮色，目标：内容从 y≈43 铺到 y≈860，不再有下半屏空洞）**

```
┌──────────────────────────────────────────────────────────────────────┐
│ [__wsn_bar] 工作台  首页● 任务台 明信片 海报墙      同一工作台·数据保存在本机 │ ≈43px 全宽
├──────────────────────────────────────────────────────────────────────┤
│        ┌──┐  工作台 / WORKBENCH                          [刷新摘要][切换主题] │
│        │▦ │  工作台                                                        │ hero ≈150px
│        └──┘  任务台 · 明信片追踪 · 书影音海报墙，三个页面共用一个入口          │
│               本机数据 · 不上传 · 亮/暗主题跟随系统                          │
│                                                                          │
│        三个工作区                              [任务管理台][明信片追踪][书影音海报墙] │ ≈40px
│        ┌───────────┐  ┌───────────┐  ┌───────────┐                     │
│        │ ▣ 48px    │  │           │  │           │                     │
│        │ 任务管理台 │  │ 明信片追踪│  │ 书影音海报墙│  3 列 gap20 / min-h360│
│        │ desc 2行  │  │           │  │           │                     │
│        ├───────────┤  ├───────────┤  ├───────────┤                     │
│        │ 3 3 8 · 指标│  │ …        │  │ …        │                     │
│        │ 打开任务台 →│  │           │  │           │                     │
│        └───────────┘  └───────────┘  └───────────┘                     │
│                                                                          │
│        ┌ 数据说明 panel ─────────────────────────────────────────────┐    │ ≈88px
│        │ 本页只读取同一浏览器（本机文件）保存在本机的摘要，不上传、不改动… │    │
│        └──────────────────────────────────────────────────────────────┘    │
│                  本机离线可用 · 双击 HTML 打开 · 数据保存在本浏览器           │ ≈40px footer
└──────────────────────────────────────────────────────────────────────┘
```

**垂直预算（900px）**：nav 43 + wrap 上 padding 36 + hero ≈150 + gap 28 + section-head 40 + gap 14 + 卡片 360 + gap 24 + 数据说明 panel ≈88 + gap 14 + 版权行 40 + 下 padding 28 ≈ **861px**，剩余 ≤40px 由 `margin-top:auto` 均匀吸收为有意的呼吸空间，而不是一整块空白。

**首屏填充的 5 个手段（全部不新增业务数据、不接后端）**
1. 补 43px 全宽导航条 + 站点身份（B1/B2）。
2. 新增品牌 hero：44px 蓝色渐变 logo + eyebrow + 30px H1 + 副标题 + 一行**静态**说明（文案取自现有 `.foot`，非新数据）。
3. 容器 960 → 1200px（内容 1152），卡片 309 → **371px**，`min-height` 293 → **360px**，内边距 20 → 24px。
4. 新增「三个工作区」小标题 + 右侧快捷跳转条（复用现有 3 个 `.navlinks` 锚点，不新增/不删除节点）→ 增加一级信息层级。
5. 现有 `.foot` 两行小字改为 12px 圆角信息面板 + 一行版权说明，并用 flex `margin-top:auto` 把页脚吸附到视口底部。

**必须保留的 DOM id（JS 依赖，一个都不能改名/删除）**
`btnRefresh`、`btnTheme`、`origin`、`foot`、`cardTasks`、`cardPostcards`、`cardMedia`、`mTaskOpen`、`mTaskDone`、`mTaskAll`、`mPcTransit`、`mPcArrived`、`mPcAll`、`mMediaAll`、`mMediaCustom`。
三张 `<a class="card">` 的 `href` 保持 `任务管理台.html` / `明信片追踪.html` / `书影音海报墙.html`；`.navlinks` 三个锚点保持。
`.foot` 内「数据说明」原文与 `#origin` 所在句子**保持原样**（B5）。`meta[name=theme-color]`、PWA 注册、`applyTheme` / `render` / `fetchMediaCount` 逻辑一律不动。

### 4.2 设计 token：亮/暗具体取值与接入方式

**接入 SHARED TOKENS 体系（B3）**
- 用 `/* === SHARED TOKENS START === */` … `/* === SHARED TOKENS END === */` 包裹 `:root` + `[data-theme="dark"]` 规范块，内容逐字节等于 `_ops/_workbench/design_tokens.css` 从第一个 `:root{` 到文件末尾（`sync_tokens.js` 会自动 +2 缩进）。
- 把 `path.join(VAULT,'Projects/home.html')` 加入 `_ops/_workbench/sync_tokens.js` 的 `TARGETS`，`node sync_tokens.js --check` 应得 4 页 `IN_SYNC`。
- ⚠️ 注意 `sync_tokens.js` 的 TARGETS 指向 **Vault/Projects/** 主副本，而工作副本在 `/tmp/toolsrepo2/`；两处 home.html 需同步落地，否则 `--check` 与工作副本不一致。
- ⚠️ **令牌陷阱（P0）**：规范块**不含 `--shadow-hover`**（home 现在用它做卡片 hover 阴影）。必须把它作为**页面私有 token 写在 END 标记之后**（约束 #4：页面私有 token 不进标记区），否则接入后 `var(--shadow-hover)` 未定义、hover 阴影失效（亮暗皆失效）。

**规范取值**

| token | light | dark | 用途 |
|---|---|---|---|
| `--bg` | `#f5f7fb` | `#0f1320` | 页面底 |
| `--card` | `#ffffff` | `#171c2b` | 卡片 / 导航条 / 面板底 |
| `--ink` | `#1f2430` | `#e7ebf3` | 主文字 / 标题 |
| `--sub` | `#6b7280` | `#9aa3b2` | 次要文字 / 标签 / 降级值 |
| `--line` | `#e7ebf2` | `#262d3f` | 描边 / 分隔线 |
| `--pri` | `#4F7CFF` | `#5b86ff` | 主色填充 / 焦点环 / logo 起点 |
| `--pri-deep` | `#3D68F0` | `#3D68F0` | 导航高亮 pill 底（白字 4.73:1） |
| `--pri-ink` | `#2F5FE0` | `#8FABFF` | **文字形态主色**（白底 5.48:1）→ `.go` / `.navlinks a:hover` |
| `--pri-soft` | `#eaf0ff` | `#1c2740` | 图标块底 / 浅强调 |
| `--hover` | `#f4f6fb` | `#1c2236` | 按钮 / 导航链接 hover |
| `--radius` | `12px` | 同 | 中档圆角（信息面板、图标块） |
| `--radius-sm` | `8px` | 同 | 小圆角 |
| `--radius-lg` | **`16px`** | 同 | **三张卡片**（与另三页面板一致） |
| `--shadow` | `0 2px 10px rgba(31,36,48,.06)` | `0 2px 10px rgba(0,0,0,.32)` | 常态 |
| `--shadow-hover`（页面私有，END 之后） | `0 6px 22px rgba(31,36,48,.12)` | `0 6px 22px rgba(0,0,0,.45)` | 卡片 hover |
| `body` | `font-size:15px; line-height:1.5` | 同 | **对齐三页 15px/1.5（现为 16px/1.6）** |

**关于 `--radius:16px` 与共享 12px「不一致」的处理（重要设计决定）**
首页卡片**视觉上的 16px 是对的**——另三页的大面板用的正是 `var(--radius-lg)` = 16px。问题不在视觉值，而在 home 把 16px 硬塞进名为 `--radius` 的单值变量里，与共享体系 `--radius:12px` 冲突，且导致 home 无法进入 sync 体系。
→ **修法不是把卡片改成 12px，而是采用三档 token 并让卡片引用 `var(--radius-lg)`**：`--radius:12px` / `--radius-sm:8px` / `--radius-lg:16px`，卡片 16px、信息面板 12px、图标块 12px、导航 pill 保持 999px。这样既解决 token 冲突、又能进 sync，视觉还与三页面板对齐。

**导航条兼容性（已逐项复核）**：`_shared/site-nav.js` 用到的 `var(--card)`、`var(--ink)`、`var(--line)`、`var(--sub)`、`var(--hover)`、`var(--pri-soft)`、`var(--pri-deep)`、`var(--pri)` 在 home 现有 `:root`/`[data-theme=dark]` 中**全部已定义**；接入规范块后也全部存在 → 亮/暗主题下导航条均可读，无需改 `site-nav.js` 本身。

**图标色（去掉 inline `style=` 硬编码，改带暗色变体的变量）**

| 卡 | light 底 / 字 | dark 底 / 字 |
|---|---|---|
| 任务台 | `var(--pri-soft)` #eaf0ff / `var(--pri-ink)` #2F5FE0 | `#1c2740` / `#8FABFF` |
| 明信片 | `--ok-soft` #e7f6ec / `#177a58` | `#10312a` / `#2dd4a0` |
| 海报墙 | `#efeafe` / `#6d4bd6`（对应共享 `--accent:#7c5cff` 语系） | `#241d3a` / `#b08cff` |

> 说明：三张卡各用一种色调是**入口识别**（对应三个目标页），属功能性区分；品牌 logo 与导航条仍统一用蓝色。此处不用 inline style，避免暗色下浅色块在 `#171c2b` 卡片上过亮。

### 4.3 布局与尺寸规范表

| 元素 | 取值 |
|---|---|
| `body` | `min-height:100vh; display:flex; flex-direction:column; padding:0; background:var(--bg); color:var(--ink); font-size:15px; line-height:1.5; transition:background .2s ease,color .2s ease` |
| `.wrap` | `width:100%; max-width:1200px; margin:0 auto; padding:36px 24px 0; box-sizing:border-box; flex:1 1 auto; display:flex; flex-direction:column` → 1440 下内容 **1152px**，左边距 x=144（有滚动条约 137） |
| `.hero` | `padding:0`；`.hero-top` `display:flex;gap:16px;align-items:center;flex-wrap:wrap` |
| `.hero .logo` | `44×44; border-radius:12px; background:linear-gradient(135deg,var(--pri),#7aa0ff); color:#fff; display:grid;place-items:center; flex:none; box-shadow:0 4px 12px rgba(79,124,255,.28)` |
| `.hero .eyebrow` | `11.5px / 600 / letter-spacing:.12em / color:var(--sub)` |
| `.hero h1` | `30px / 650 / line-height:1.25 / letter-spacing:.01em / margin-top:2px` |
| `.hero .desc` | `14px / var(--sub) / line-height:1.6 / max-width:620px / margin-top:12px` |
| `.hero .acts` | `display:flex;gap:8px;flex-wrap:wrap;margin-top:18px` |
| `.hero .meta` | `12px / var(--sub) / margin-top:14px` |
| `.section` | `margin-top:28px` |
| `.section-head` | `display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px` |
| `.section-head h2` | `16px / 650` |
| `.navlinks` | `display:flex;gap:8px;flex-wrap:wrap;margin-left:auto`；`a` = `12px / padding:5px 12px / 999px / 1px solid var(--line) / bg var(--card) / color var(--sub)`；hover/focus `color:var(--pri-ink);border-color:var(--pri)` |
| `.grid` | `display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px` → 卡宽 `(1152−40)/3 = 370.7px` |
| `.card` | `display:flex;flex-direction:column; min-height:360px; padding:24px; background:var(--card); border:1px solid var(--line); border-radius:var(--radius-lg); box-shadow:var(--shadow); text-decoration:none; color:inherit; transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease` |
| `.card .ico` | `48×48; border-radius:var(--radius); display:grid;place-items:center; font-size:24px; line-height:1; margin-bottom:16px` |
| `.card h2` | `18px / 650 / margin-bottom:6px` |
| `.card .desc` | `13px / var(--sub) / line-height:1.55 / min-height:42px` |
| `.metrics` | `display:flex; gap:20px; margin:16px 0; padding:14px 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line)`；`.metric{flex:1 1 0;min-width:0}` |
| `.metric .n` | `24px / 700 / line-height:1.2 / min-height:29px / font-variant-numeric:tabular-nums / color:var(--ink)` |
| `.metric .n.dim` | `color:var(--sub); font-weight:400`（JS `setText` 已 toggle 该类，保持不变） |
| `.metric .l` | `11.5px / var(--sub) / margin-top:4px / white-space:nowrap` |
| `.go` | `margin-top:auto; padding-top:16px; font-size:13px; font-weight:650; color:var(--pri-ink); display:flex;align-items:center;gap:6px` |
| `.btn` | `font:inherit; font-size:12.5px; padding:8px 14px; border-radius:999px; border:1px solid var(--line); background:var(--card); color:var(--ink); cursor:pointer; transition:background .15s ease,border-color .15s ease` |
| `.foot`（数据说明面板） | `margin-top:auto; display:flex; gap:12px; align-items:flex-start; padding:16px 18px; border:1px solid var(--line); border-radius:var(--radius); background:var(--card); font-size:12px; color:var(--sub); line-height:1.75`。**保留 `id="foot"` 与 `id="origin"` 及原文**；`b` 用 `color:var(--ink);font-weight:600` |
| `.copyright`（页脚，可选新增纯静态文本） | `margin-top:14px; padding-bottom:calc(28px + env(safe-area-inset-bottom)); font-size:11.5px; color:var(--sub); text-align:center`；文案「本机离线可用 · 双击 HTML 打开 · 数据保存在本浏览器」 |

### 4.4 参考 CSS 取值（规范示意，非成品文件）

```css
/* === SHARED TOKENS START ===（内容 = design_tokens.css 规范块，逐字节由 sync 写入） */
/* === SHARED TOKENS END === */
/* ↓↓↓ 页面私有 token：必须在 END 之后 ↓↓↓ */
:root{ --shadow-hover:0 6px 22px rgba(31,36,48,.12); }
[data-theme="dark"]{ --shadow-hover:0 6px 22px rgba(0,0,0,.45); }

*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;flex-direction:column;padding:0;
     font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
     background:var(--bg);color:var(--ink);font-size:15px;line-height:1.5;
     transition:background .2s ease,color .2s ease}
.wrap{width:100%;max-width:1200px;margin:0 auto;padding:36px 24px 0;
      flex:1 1 auto;display:flex;flex-direction:column}

/* 图标色变量（暗色有变体） */
:root{ --ic1-bg:var(--pri-soft); --ic1-fg:var(--pri-ink);
       --ic2-bg:#e7f6ec;        --ic2-fg:#177a58;
       --ic3-bg:#efeafe;        --ic3-fg:#6d4bd6; }
[data-theme="dark"]{ --ic1-bg:#1c2740; --ic1-fg:#8FABFF;
                     --ic2-bg:#10312a; --ic2-fg:#2dd4a0;
                     --ic3-bg:#241d3a; --ic3-fg:#b08cff; }

/* 交互态 */
.btn:hover{background:var(--hover);border-color:var(--pri)}
.btn:focus-visible,.navlinks a:focus-visible{outline:2px solid var(--pri);outline-offset:2px}
.card:hover{transform:translateY(-3px);box-shadow:var(--shadow-hover);border-color:var(--pri)}
.card:active{transform:translateY(-1px)}
.card:focus-visible{outline:2px solid var(--pri);outline-offset:3px}
.card:hover .go{color:var(--pri)}
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}
  .card:hover,.card:active{transform:none}
}

/* 响应式 */
@media(max-width:1100px){ .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px} }
@media(max-width:768px){ .grid{grid-template-columns:1fr;gap:16px}
                         .card{min-height:0;padding:20px}
                         .wrap{padding:28px 20px 0}
                         .navlinks{margin-left:0} }
@media(max-width:430px){ .wrap{padding:20px 16px 0}
                         .hero h1{font-size:24px}
                         .hero .logo{width:40px;height:40px}
                         .metrics{gap:12px}
                         .hero .acts .btn{flex:1 1 auto;text-align:center}
                         .card .desc{min-height:0} }
```
> 上述是**属性取值规范**，开发按现有 `<style>` 结构改写即可；不得整段替换 `<head>` 里的 manifest / theme-color / 图标引用，也不得改 `<script>`。

### 4.5 统一导航条接入方式（B1）

`_shared/site-nav.js` 已内建对 home 的支持，**无需改该源文件**：`currentPage()` 命中 `home.html` → 返回 `"home"`；`PAGES[0]` 是 `{id:"home",label:"首页",href:"home.html"}`，因此首页导航项自动 `__wsn_on` + `aria-current="page"`，4 个链接同标签跳转。

需要做的（开发执行，本文不代改）：
1. 在 `home.html` 的 `</body>` 前新增 `<script>` 块，内容为 `/* >>> SITE-NAV:BEGIN —— 由 _shared/site-nav.js 自动生成，请勿直接编辑本块 */` + `site-nav.js` 全文 + `/* <<< SITE-NAV:END */`（标记文案须与 `inject_shared.py` 完全一致）。
2. 把 `/tmp/toolsrepo2/home.html` 加入 `_shared/inject_shared.py` 的 **SITE-NAV** `targets` 数组（**只加 SITE-NAV，绝不加 SHARED** —— 约束 #1：`shared.js` 整块注入海报墙/门户页会与 6 处同名顶层声明冲突白屏）。
3. 运行 `python3 _shared/inject_shared.py`，随后对内联块与 `_shared/site-nav.js` 做逐字节一致性断言（约束 #2）。
4. ⚠️ **P0 陷阱 A**：`inject()` 在找不到标记块时会打印「未找到标记块，跳过」并静默返回 —— 只加 targets 不加标记块，导航条根本不会出现且不报错。
5. ⚠️ **P0 陷阱 B**：`site-nav.js` 用 `document.body.insertBefore(nav, body.firstChild)` 且 `.__wsn_bar{width:100%}`。现 `body{padding:28px 20px …}` 会让导航条左右各内缩 20px、顶部内缩 28px，与三页全宽导航条明显不一致 → **必须 `body{padding:0}` 并把 padding 移进 `.wrap`**（§4.2/4.3 已给出）。
6. 导航条高度约 40–43px（brief 实测 43px）；亮色 `bg var(--card)` + `border-bottom var(--line)`，暗色 `#171c2b` / `#262d3f`；`prefers-reduced-motion` 与 `:focus-visible` 由 `site-nav.js` 自带，无需重复写。
7. 键盘顺序：4 个导航链接 → 刷新摘要 → 切换主题 → 3 个快捷跳转 → 3 张卡片 → （非交互说明）。`site-nav.js` 把 nav 插为 body 首子节点，天然排在最前。

### 4.6 交互与状态表

| 交互 / 状态 | 触发 | 输入 | 结果 | 失败反馈 / 降级 |
|---|---|---|---|---|
| 卡片链接 | click / Enter | 无 | 同标签打开对应页面 | 文件缺失为浏览器 404（页面外），本页无额外反馈；不需新增 toast |
| 导航条链接 | click / Enter | 无 | 同标签跳转；当前页高亮由 `aria-current` 标记 | 由 `site-nav.js` 保证，无需处理 |
| 快捷跳转 `.navlinks` | click / Enter | 无 | 同标签跳转 | 同上 |
| 刷新摘要 `#btnRefresh` | click | 无 | 清 `MEDIA_CACHE_KEY` 后 `render()`，8 个指标按同源 localStorage 重算 | localStorage 被禁用/损坏 → `read()` 内 try/catch 返回 `null` → 显示 `—`（静默降级，不报错、不弹窗） |
| 切换主题 `#btnTheme` | click | 无 | `data-theme` 切换 + 写 `wb_workbench_theme` / `wb_theme_v1` + 更新 `theme-color` | 写失败时视觉仍切换，只是不记忆；`try/catch` 静默 |
| 指标降级态 | 无数据 | `setText(v=null)` | 数值 `—`，`.dim` 用 `--sub`/400；标签文字不变；`.foot` 面板解释「—」含义 | —— |
| **数据加载态** | —— | —— | **无**（`localStorage` 同步读取；`fetchMediaCount` 为 fire-and-forget 回填，不显示 loading） | 不新增 spinner / 骨架屏，避免引入新 JS 状态（B8） |
| **空态** | —— | —— | 即「降级态 `—`」+ 数据说明面板，不另做空状态插画 | —— |
| **错误态** | —— | —— | 静默降级（`read()` / `fetch().catch()` 已吞错），无界面错误提示 | 现有 `.foot` 文案已覆盖说明，不新增报错 UI |
| **保存态** | —— | —— | **无**（本页只读，不写任何业务数据，B5） | —— |
| hover | 指针 | —— | 卡片 `translateY(-3px)` + `--shadow-hover` + 边框 `var(--pri)`；按钮/快捷跳转 hover 变色 | 触屏建议补 `@media(hover:none){.card:hover{transform:none;box-shadow:var(--shadow)}}`，避免 sticky hover |
| focus-visible | Tab | —— | 2px `var(--pri)` 描边 + offset 2/3px | 亮色 3.4:1 / 暗色约 6:1，满足非文本 3:1 |
| active | 按下 | —— | `translateY(-1px)` | reduced-motion 下禁用全部 transform/transition |

### 4.7 响应式断点（B6）

| 视口 | 列数 / 卡宽（内容宽） | 关键调整 | 校验点 |
|---|---|---|---|
| **1440** | **3 列 / 370.7px**（内容 1152） | 默认；`.wrap` 1200 + 24px padding | 无横向溢出；左 x≈144；首屏内容铺到 y≈860 |
| **1024** | **2 列 / 480px**（内容 976） | `@media(max-width:1100px)` 生效 | 2 列不错位；导航条 4 链接仍单行 |
| **768** | **1 列 / 720px**（内容 720） | `@media(max-width:768px)`：`.wrap padding:28px 20px 0`、`.card min-height:0`、`.navlinks` 左对齐 | 单列；`__wsn_hint` 在 ≤680 隐藏不生效于 768，4 链接 + brand 需确认不溢出（`.__wsn_links` 有 `overflow-x:auto;min-width:0` 兜底） |
| **390** | **1 列 / 358px**（内容 358） | `@media(max-width:430px)`：h1 24px、logo 40px、metrics gap12、按钮等分、desc `min-height:0` | 无横向溢出；`__wsn_hint` 隐藏（≤680）；指标 3 项在 358px 内不折行溢出（`flex:1 1 0;min-width:0`） |

- 一律**不使用 `overflow-x:hidden` 掩盖溢出**；靠 `minmax(0,1fr)` / `min-width:0` / `flex-wrap` 消除。
- 保留 `env(safe-area-inset-bottom)` 与 `viewport-fit=cover`。
- 可逆假设：若主理人认为 1024 下 2 列（480px）过宽，把 2 列断点从 `1100px` 下移到 `900px` 即可（1440/1024 均 3 列），其余取值不变。**此为需主理人确认的视觉取舍，不影响其它数值。**

### 4.8 焦点、键盘、对比度、动效

- 焦点顺序见 §4.5(7)；所有可交互元素（4+2+3+3 = 12 个）均可 Tab 到达，`:focus-visible` 可见（B7）。
- 对比度关注点（基于共享 token 注释）：
  - `--pri:#4F7CFF` 白底仅 3.71:1，**不可当文字用** → 文字链接一律 `--pri-ink`（亮 5.48:1 / 暗 `#8FABFF` 深底约 6:1）。
  - 现 `.go` 用 `--pri-deep:#3D68F0` 作文字（4.73:1，勉强过 AA），改 `--pri-ink` 属**语义对齐**，不是修复不达标。
  - `--sub:#6b7280` 白底 4.83:1、`--bg` 上约 4.6:1，均过 AA 小文本；暗色 `#9aa3b2` on `#171c2b` ≈7:1。
  - 导航高亮 pill 白字 on `--pri-deep:#3D68F0` = 4.73:1，过 AA（13px）。
  - 焦点环 `--pri` on `--bg` 亮色 ≈3.4:1、暗色 ≈6:1，满足 WCAG 1.4.11 非文本 3:1。
  - 图标块：亮 `#2F5FE0` on `#eaf0ff` ≈5:1；暗 `#8FABFF` on `#1c2740` ≈5.5:1。
- `prefers-reduced-motion:reduce`：禁用 `.card` transform / 全部 transition / animation；`site-nav.js` 自带链接 transition 关闭。现 home 已有该规则，扩展为通配符覆盖即可。
- 表单：本页**无输入表单**，故无 label / 错误提示需求；「错误提示」仅体现为数据说明面板的静态文案（§4.6）。

### 4.9 素材来源与占位（不虚构已取得素材）

- **logo 图标**：不新增图片文件、不引入图标库。复用三页 `.brand .logo` 已有的内联 SVG 之一（任务台的勾选方框，或海报墙 24×24 胶片格 `<rect>/<path>`，见 `书影音海报墙.html:547`），改 `width/height:18px; stroke:#fff`；或退化为纯 CSS 2×2 白色圆角方块占位。**未取得任何新图标/图片资源**。
- **三个卡片图标**：沿用现有 Unicode 字形 `✓` / `✉` / `▦`（已在 DOM 中），仅放大到 24px；无需素材。
- **海报/封面图**：本规范不涉及，海报墙 MEDIA 数据体（1731 条）与图片逻辑一律不动。

### 4.10 变更边界（禁止越界）

- 不写 `index.html`（D2 要求与 `任务管理台.html` 逐字节一致）。
- 不改 `_shared/site-nav.js` 内容；不改 `shared.js`；不把 `shared.js` 注入 home / 海报墙。
- 不新增页面、不合并 SPA、不改根入口 `/tools/`、不接后端、不改 PWA 形态。
- 不改任何 `localStorage` 键名、不写业务数据；`summaryTasks/summaryPostcards/summaryMedia/fetchMediaCount/render/applyTheme` 全部保持。
- `sync_tokens.js` / `inject_shared.py` 的目标列表修改属开发实施动作，本文只给规范，不代改、不代跑 `--check`。

---

## 5. 视觉类问题清单（按 P0 / P1 / P2）

> 定义：**P0** = 会在本轮改造中直接导致验收失败或视觉破损，必须随本次一起处理；**P1** = 用户可见的一致性/体验缺陷，建议本轮改；**P2** = 打磨项，可延后。
> 本清单**仅覆盖视觉维度**；交互流程 / 代码实现 / 业务逻辑 / 功能完整性由主理人汇总其它成员结论。

| # | 级别 | 模块 / 位置 | 当前表现 | 影响 | 具体修改建议 | 立即改 |
|---|---|---|---|---|---|---|
| 1 | **P0** | `home.html` / SITE-NAV | 全文件 `wsn` 出现 0 次，无 `SITE-NAV:BEGIN/END` 标记块，且不在 `inject_shared.py` 的 SITE-NAV targets | B1 无法满足；首页无统一导航、无「首页」高亮，与三页割裂；`inject()` 遇无标记会静默「跳过」，易被误判为已接入 | 按 §4.5 加标记块 + 加 targets + 跑 inject + 逐字节断言；**只加 SITE-NAV，不加 SHARED** | **是** |
| 2 | **P0** | `home.html` / SHARED TOKENS | 接入规范 token 块后 `--shadow-hover` 未定义（规范块不含该变量） | `.card:hover` 阴影失效，亮/暗皆失效，交互反馈丢失 | 把 `--shadow-hover`（含 dark 变体）作为页面私有 token 写在 `SHARED TOKENS END` **之后**（§4.2）；接入后目检 hover | **是** |
| 3 | **P0** | `home.html` / `body` | `body{padding:28px 20px …}`，而 `site-nav.js` 以 `body.firstChild` 插入 `width:100%` 导航条 | 导航条左右内缩 20px、顶部内缩 28px，与三页全宽 43px 导航条明显不一致；同时 `.wrap` 居中基准被污染 | `body{padding:0;min-height:100vh;display:flex;flex-direction:column}`，padding 全部下移进 `.wrap`（§4.3） | **是** |
| 4 | **P1** | `home.html` / 首屏整体 | 1440×900 下内容止于 y≈547，下方约 **353px（≈39% 视口）空白**；无 logo、无品牌区，仅 26px 文本标题 | 用户明确反馈「还不是很好看」；B2 无法满足 | 按 §4.1 的 5 项填充 + §4.3 尺寸表：hero 品牌区、容器 1200、卡片 min-h360、section-head、数据说明面板 + flex 吸附页脚 | **是** |
| 5 | **P1** | `home.html` / `.wrap` | `max-width:960px`，内容 960、左边距 x=240；卡片仅 309px | 与三页 1360（x=47/58）比例脱节，卡片显小、首屏显空 | `max-width:1200px;padding:36px 24px 0` → 内容 1152、卡 371px、x≈144 | **是** |
| 6 | **P1** | `home.html` / `:root` | 手写 `--radius:16px` 单值，与共享 `--radius:12px` 冲突；不在 `sync_tokens.js` TARGETS、不在 SHARED TOKENS 标记体系 | B3 无法满足；token 漂移会持续累积 | 按 §4.2 接入三档 token 并让 `.card` 用 `var(--radius-lg)`（**保持视觉 16px**）；加 home 到 TARGETS 并跑 `--check` 4 页 IN_SYNC | **是** |
| 7 | **P1** | `home.html` / `body` 字号 | `16px / 1.6`（默认），三页均 `15px / 1.5` | 跨页字号基线不一致，卡片内文字偏松 | `body{font-size:15px;line-height:1.5}` + §4.3 显式字阶 | **是** |
| 8 | **P1** | `home.html` / 三张卡 `.ico` | 三个 inline `style="background:#eaf0ff…"` / `#fdeaf1…` / `#f0eafe…`，无暗色变体 | 暗色下浅色图标块在 `#171c2b` 卡片上过亮、突兀（B1 暗色可读） | 改为 §4.2 的 `--ic1/2/3-bg|fg` 变量并补 dark 覆盖，移除 inline style | **是**（随首页改造） |
| 9 | **P1** | `书影音海报墙.html` / `.brandbar .logo` `:38`、`.f-save` `:293`、`.search-add` `:271`、`.search-banner` `:466`、`.f-tip` `:294`、mark `:474` | logo 渐变 `…,#a855f7)` 紫；主 CTA / 保存按钮 `linear-gradient(120deg,#a855f7,#ec4899)` 粉紫；搜索高亮紫 `rgba(168,85,247,…)` | 跨页「主操作色」不统一（另两页与共享导航条均蓝），是「像另一个站点」的第 2 主因（≈22%） | **只改品牌层**：logo 第二色 `#a855f7→#7aa0ff`；主 CTA/保存 `→var(--pri-deep)` 或 `linear-gradient(135deg,var(--pri),#7aa0ff)`；搜索横幅/mark 紫 → `var(--pri-soft)` / `rgba(79,124,255,.18)`。**保留** `.section-title` 语义分类色、`TYPE_META` 渐变、`.gtag` | 否（可延后，功能不受影响；改动需 C2/D5 回归） |
| 10 | **P1** | `书影音海报墙.html` / 圆角 | `.pcard` 硬编码 `10px`（`:179`）；stats `12px`、ana `12px`、prof `14px`、modal `18px`、sib-link/vtab `12px`；而 `:root` 已有 `--radius:12px/--radius-sm:8px/--radius-lg:16px` | 同页 5 档圆角，与另两页 `var(--radius-lg)=16px` 面板不齐；token 形同虚设 | 收敛到三档：pcard/stats/ana → `var(--radius)`(12)；prof → `var(--radius-lg)`(16)；modal 可保留 18px 但建议 `var(--radius-lg)`；小控件 → `var(--radius-sm)`(8) | 否（可延后，纯视觉） |
| 11 | **P2** | `书影音海报墙.html` / `.wrap` `:75` | `1240px`（内容 1192、x=117）vs 另两页 1360（1332/1324、x=47/58） | 单侧多 59–70px 留白，仅占视觉差异 ≈7% | **本轮建议保留**，量化理由见 §3.3；若主理人坚持对齐，选方案 A/B 并跑 C2/D5 回归 | 否 |
| 12 | **P2** | 全站 / 容器宽度阶梯 | 三档宽度 960 / 1240 / 1360 并存，无成文说明 | 本身不是缺陷（门户 vs 应用画布可合理不同），但缺乏约定易再次漂移 | 在规范中固化：门户 1200、应用页 1360、画廊 1240（或未来统一），并注明各自理由 | 否 |
| 13 | **P2** | `home.html` / `.go` `:52` | 文字用 `--pri-deep`（token 注释定义为「底色压白字」） | 非缺陷（4.73:1 过 AA），但与共享 token 语义不一致 | 改 `var(--pri-ink)`（5.48:1），与 token 意图对齐 | 否 |
| 14 | **P2** | `home.html` / `.foot` `:53` | 数据说明为 2 行 12px 纯文本，层级弱 | 降级态解释不易被注意 | 改为 12px 圆角信息面板（`var(--radius)`）+ 独立版权行（§4.3） | 否（可随 P1#4 一起做） |
| 15 | **P2** | `home.html` / 指标数字 | 无 `font-variant-numeric`，`—` ↔ 数值切换时轻微跳动 | 极轻微的布局抖动 | `.metric .n{font-variant-numeric:tabular-nums;min-height:29px}` | 否 |
| 16 | **P2** | `home.html` / 无障碍 | 无 `.skip-link`（三页有）；`@media(hover:none)` 未处理触屏 sticky hover | 键盘用户无跳转主内容入口；触屏 hover 可能残留 | 可选加 skip-link；补 `@media(hover:none){.card:hover{transform:none;box-shadow:var(--shadow)}}` | 否 |
| 17 | **待定** | `home.html` / `.navlinks` `:78` | 3 个快捷跳转锚点与新增 `__wsn_bar` 功能重复 | 信息冗余（不是缺陷） | **保留 DOM 节点**（QA/JS 安全），仅降级为右对齐次要样式（§4.3）；是否在 ≥1024 隐藏由主理人决定 | 否（需主理人定） |

---

## 6. 已做检查、假设与待办

**已做检查（真实执行，可复核）**
1. 逐行读取 `brief.md` / `acceptance.md` / 四页源码 / `design_tokens.css` / `site-nav.js` / `inject_shared.py` / `sync_tokens.js` 头部 / `harness.js` / `verify_partial.js`。
2. 四页 CSS 反推 8 项几何值，与 brief 的 1440×900 量测表**逐项吻合**（§2.1 公式）。
3. 查看 4 张 1440×900 亮色首屏截图：确认 home 下半屏空白 / 无导航条 / 无 logo / 指标显示「—」；确认另三页均有全宽导航条与品牌 logo；确认海报墙为 8 列小海报 + 紫 logo + 粉紫 CTA；确认任务台/明信片为蓝色全宽面板；确认明信片首屏空白属空数据态。
4. 逐项核对 `site-nav.js` 用到的 8 个 CSS 变量在 home 的 `:root` / `[data-theme="dark"]` 中全部存在 → 亮暗兼容（§4.2）。
5. grep 复核 `/tmp/harness.js`（53 处 check）与 `/tmp/verify_partial.js`：**无 CSS / 宽度 / 圆角 / 几何断言**，纯 DOM 桩 + innerHTML 内容断言 → 纯 CSS 改 `.wrap` 不会触发 52 项失败。
6. 复核 `inject_shared.py`：`SITE-NAV` targets 仅三页，SHARED targets 仅任务台 + 明信片；`inject()` 无标记块时静默跳过（P0#1 依据）。
7. 复核 `sync_tokens.js`：`TARGETS` 为 Vault `Projects/` 下 3 页，规范块不含 `--shadow-hover`（P0#2 依据）。

**未做 / 未验证（不声称通过）**
- **未用 agent-browser 重新渲染任何页面**，未对本文提出的建议方案做浏览器视觉预览 → 建议方案的最终观感需开发实现后由 QA 复核。
- 未运行 `inject_shared.py`、`sync_tokens.js --check`、`node --check`、`harness.js`、`verify_partial.js`、D5 冒烟；这些是开发/QA 动作。
- 未验证暗色模式下首页新图标色 / 导航条的实际截图（仅按 token 对比度推算）。
- 未验证 1024 / 768 / 390 三个断点的真实渲染（仅按盒模型推算，见 §4.7）。

**采用的假设（可逆，已注明）**
- 1024 下取 2 列（480px 卡）；若判定过宽，把 2 列断点 1100→900px 即可（§4.7）。
- ≤768 判为「窄屏」取单列；若主理人把 768 也视为平板 2 列，把 `max-width:768px` 断点下调到 640px 即可。
- `.navlinks` 保留 DOM（不删节点），仅降级样式；是否在桌面隐藏待定（#17）。
- 首页容器取 1200px 而非 1360px：门户只有 3 张卡，1360 会令卡片过宽（约 424px）且稀疏；1200 是「填补首屏 + 保持聚焦」的折中，不追求与应用画布同宽（B3 只要求 token 基线一致）。

**需主理人决定**
1. 海报墙 `.wrap` 是否仍要改 1360（本文建议**不改**，方案 A/B 备选见 §3.3）。
2. 海报墙品牌色相紫→蓝（#9）与圆角收敛（#10）是否纳入本轮，还是列入下轮（涉及 C2/D5 回归）。
3. §4.7 的 1024 列数取舍、`≤768` 单列阈值、`.navlinks` 桌面是否隐藏。
4. B3 要求「门户纳入 token 同步体系」会牵动 Vault `Projects/` 主副本与 `sync_tokens.js` TARGETS，需确认主副本同步责任人与落地方式。

**需开发验证（交付时逐条回报）**
- B1：导航条全宽、4 链接可点、「首页」高亮、亮暗可读、内联块逐字节一致。
- B2：1440×900 首屏内容底边 ≥ y≈820，无下半屏空洞。
- B3：`node sync_tokens.js --check` 相关页面 IN_SYNC；卡片 hover 阴影仍生效（P0#2）。
- B4/B5：8 个指标 / 3 卡 / 刷新 / 主题 / 暗色正常；降级 `—` + 数据说明原文不变；不写业务数据。
- B6：1440 / 1024 / 768 / 390 无横向溢出、无重叠、不错位；窄屏单列。
- B7：12 个可交互元素 Tab 可达、focus-visible 可见、reduced-motion 生效。
- B8：`node --check` 通过、无新 JS 报错、零外部依赖。
- C2/D5（若改海报墙）：52/52 回归 + 浏览器冒烟（墙视图 / 分析页 / 明暗主题）。
- D2：`index.html` 与 `任务管理台.html` 逐字节一致；NAV/SHARED 内联块与源文件一致。
