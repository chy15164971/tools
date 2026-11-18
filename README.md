# 工作台站点（tools）

单文件零依赖 HTML 工作台：门户 `home.html` + 三个子应用（任务管理台 / 明信片追踪 / 书影音海报墙）。
本地优先 localStorage，GitHub Gist 为可选云同步，无账号体系、无后端。

线上：https://chy15164971.github.io/tools/home.html
仓库：`chy15164971/tools`，主分支 `main`。本仓库即发布仓库，push 后 GitHub Pages 自动构建。

## 发布契约（改动前必读）

1. **`index.html` 必须逐字节等于 `任务管理台.html`**。改完任务台后执行
   `cp 任务管理台.html index.html`，否则用户从根路径进入的是旧版。
2. 五页的共享代码由 `_shared/inject_shared.py` 注入四块：`SHARED`（任务台/明信片/index）、
   `SITE-NAV-HTML`（五页）、`SITE-NAV`（五页）、`MODAL-A11Y`（任务台/明信片/index/海报墙）。
   **不要在页面里直接编辑标记区内的内容**，改源文件 `shared.js` / `site-nav-static.html` /
   `site-nav.js` / `modal-a11y.js` 后重新注入。
   ⚠️ `MODAL-A11Y` 是弹窗无障碍 IIFE 的**唯一真相源**（2026-11-16 收敛，此前 shared.js 与
   海报墙各有一份手抄副本）。四页都由 `a11y_src()` 生成，发布门禁逐字节比对；
   **只改源文件不重注入 = 门禁报红**。海报墙因 `confirmWall` 动态插入需要 `childList=true`，
   其余三页为 `false`；门户 `home.html` 无弹窗不注入。整份 `shared.js` 仍**不可**注入海报墙/门户。
   导航条必须是 `<body>` 开头的静态 HTML，不能退回 JS 延迟插入（会重现首屏闪旧画面）。
3. 共享色板唯一真相源是 vault `_ops/_workbench/design_tokens.css`；
   私有变量写在 `SHARED TOKENS START/END` 标记区**之外**，否则下次同步会被整块覆盖。
4. **改任何 HTML 字节都要升 `APP_CACHE` 版本号**（当前 v16）：SW 字节不变就不触发 install，
   已安装 PWA 会继续从旧预缓存读页面（2026-11-13 v6、11-15 v7、11-16 v8→v9→v10→v11→v12、11-17 v13→v14、11-18 v15→v16 均按此处理）。
   导航请求用 `fetch(url,{cache:"no-store"})` 绕过 Pages 的 `max-age=600`；
   不要写成 `fetch(e.request, init)`（navigate 模式重建 Request 会抛 TypeError）。
5. `_shared/` 目录以下划线开头，GitHub Pages 不发布；源文件已内联进五个 HTML，线上 404 属预期。

## 一键校验

```bash
./check.sh              # 1–3 步：发布门禁 + token 一致性 + 回归镜像一致性（秒级）
./check.sh --full       # 再加 4–5 步：全量回归 + 焦点陷阱真浏览器 E2E（约 5 分钟）
```

| 检查 | 命令 | 作用 |
|---|---|---|
| 发布门禁 | `python3 _shared/verify_release.py` | 7 项：index 契约、17 个内联块、导航块位置、tokens、PRECACHE、品牌链接、**弹窗无障碍唯一源守卫** |
| 色板同步 | `node "$VAULT/_ops/_workbench/sync_tokens.js" --check --repo .` | 五页 SHARED TOKENS 与 design_tokens.css 一致 |
| 全量回归 | `python3 "$VAULT/_ops/_workbench/run_regression.py"` | 58 个用例；0 未解释失败才算通过 |
| 镜像校验 | `... run_regression.py --check-mirror` | 显式清单 23 项逐字节一致（含 `sw.js`、`_shared/modal-a11y.js`、`index.html`、`home.html`、海报墙、`icons/` 全部图标；11-16 删除无引用的 `manifest-postcard.json`） |
| 焦点 E2E | `python3 "$VAULT/_ops/_workbench/focus_trap_e2e.py"` | 真实 Chrome Tab / Shift+Tab 回环；任务台 / 明信片 / 海报墙四弹窗 + 待认领弹窗，含动态确认框与背景锁滚 |

`VAULT` 默认为 `/Users/chenhuiying/Documents/Obsidian Vault`，可用环境变量 `VAULT_DIR` 覆盖。

2026-11-16 遗留风险修复：① 弹窗无障碍 IIFE 收敛为 `_shared/modal-a11y.js` 单一源，
`inject_shared.py` 第四块 `MODAL-A11Y` 注入四页，`verify_release.py` 按 17 块逐字节比对 +
唯一源守卫（负向对照：只改源文件不重注入 → 门禁 5 项 FAIL）；② 海报墙新增「待认领感想」
入口，把共用默认海报、无法自动归属的旧感想从「保留但不可见」改成可见全文 / 手动认领 /
二次确认删除，认领后旧键写 `_claimedTo` 标记并抬高 ts，防 Gist 并集合并把它复活。
新增 `_测试/站点_遗留风险修复_20261116.冒烟测试.mjs`（26 条断言，含 7 个函数级行为复跑；
改前对照 **3 PASS / 17 FAIL**），真浏览器认领 E2E 与 `focus_trap_e2e.py` 的 claimMask 断言同步落地。
本轮最终门禁：全量回归 **50 PASS / 0 KNOWN / 0 FAIL**（SKIP 6 显式披露）、焦点 E2E **36 PASS / 0 FAIL**、镜像 24 项一致。
执行记录与证据：`deliverables/workbench-audit-1105/遗留风险修复执行报告_20261116.md`。

2026-11-16 低风险批（用户从推荐清单选择「打包做低风险批」）：① 海报墙补 `viewport-fit=cover`
（7+ 处 `env()` 此前恒为 0）、搜索建议缩略图补 `alt=""`、遮罩补 `-webkit-backdrop-filter`；
② 任务台 / index 同类前缀；③ 门户降级计数标签不再错误承诺「含自定义」，按数据来源
（`source:"fallback"`）判定；④ SW navigate 分支补 `res.ok` 检查——此前 HTTP 404 会
`resolve(!ok)` 直接漏给离线用户，现在两次请求都非 2xx 才交回 `offlineFallback`。
新增 `_测试/站点_低风险批_20261116.冒烟测试.mjs`（22 条断言，含 4 组 SW 行为复跑；改前对照 **7 PASS / 13 FAIL**）。
本轮最终门禁：全量回归 **51 PASS / 0 KNOWN / 0 FAIL**、焦点 E2E **36 PASS / 0 FAIL**、镜像 24 项一致。
执行记录与证据：`deliverables/workbench-audit-1105/低风险批修复执行报告_20261116.md`。

2026-11-16 第三梯队（用户「帮我做第三梯队」）：① 明信片编辑弹窗新增「解除与对方的关联」入口，
二次确认后跨 sent / received / proxies 三数组清除 pairId（记录本身保留，只进不出的问题闭环）；
② 门户明信片卡 67 字 desc 精简为 21 字，完整统计口径移到 title，390px 下三卡 desc 同为 21px；
③ SW 预缓存失败改为收集并 `console.warn`（不再静默吞），海报缓存改为按 `cache.keys()` 计数 +
LRU 淘汰最旧海报键（原先生命周期计数器重启归零后可无限增长，且只筛海报键不动 16 项 PRECACHE）；
④ 媒体进度看板跳转壳补 `prefers-color-scheme: dark`；⑤ 删除无任何引用的 `manifest-postcard.json`，
镜像清单 24 → 23 项。新增 `_测试/站点_第三梯队_20261116.冒烟测试.mjs`（22 条断言，含解绑与 LRU 两组行为复跑；
改前对照 **3 PASS / 19 FAIL**）。本轮最终门禁：全量回归 **52 PASS**、焦点 E2E **36 PASS**、镜像 23 项一致。
执行记录与证据：`deliverables/workbench-audit-1105/第三梯队修复执行报告_20261116.md`。

2026-11-16 海报墙 1731 条 MEDIA 数据规范化（用户「做海报墙 1731 条数据规范化」）：
全量审计确认 type / year / rating / title / poster 引用 / 重复键均干净（1724 个海报文件全部存在），
真正异常只在两个字段：① 11 条畸形 `date` 归一为 `YYYY` 或 `YYYY-MM`
（`YYYY.M`、`YYYY年M月`、`YYYY年MM`、`YYYY(中国` 取年份前缀；`2015010` 依《我是歌手》第三季
2015-01-02 首播确认为 `2015-01`）；② 清除 1 条纯数字 `platform:"36.0"`。
**不编造**：55 条合法年粒度 date、6 条无合适默认图的空 poster、10 条本就没有 date 键的记录全部保持原样。
新增 `_测试/站点_数据规范化_20261116.冒烟测试.mjs`（20 条断言；改前对照 **5 PASS / 15 FAIL**）。
本轮最终门禁：全量回归 **53 PASS / 0 KNOWN / 0 FAIL**、焦点 E2E **36 PASS / 0 FAIL**、镜像 23 项一致；
真浏览器 12 PASS（含 6 条详情弹窗渲染）。
执行记录与证据：`deliverables/workbench-audit-1105/数据规范化执行报告_20261116.md`。

2026-11-16 主题按钮四形态统一（用户「帮我都做」）：四页主题入口统一为动作型文案「切换主题」+
状态图标 SVG + `aria-pressed` + title/aria-label（`当前：亮色/暗色主题 · 点击切换为…`）；
任务台本来就是参考实现，海报墙与门户由 `updateThemeBtn()` 在 `applyTheme()` 里同步，明信片同步 innerHTML。
新增 `_测试/站点_主题按钮统一_20261116.冒烟测试.mjs`（30 条断言；改前对照 **11 PASS / 19 FAIL**）。
P1-9 分层守卫 G9 因明信片 `applyTheme()` 改动词合法重冻（改前字节 40 PASS / 0 FAIL 对照）。
本轮最终门禁：全量回归 **54 PASS / 0 KNOWN / 0 FAIL**、焦点 E2E **36 PASS / 0 FAIL**、镜像 23 项一致；
真浏览器主题按钮 40 PASS、v11→v12 真安装态离线升级 9 PASS、跨浏览器/触控静态审计 7 PASS。

2026-11-16 剩余验证（用户「帮我都做」）：① Gist 往返隔离验证——`agent-browser network route --body`
在本机不拦截（返回真实 GitHub 404/401），改为页面内覆盖 `window.fetch` 的隔离 mock；
发现 `cloudPull(false)` 会先弹 `#confirmMask` 等确认，验证脚本补点 `#confirmOk` 后走通真实合并路径。
下行云端条目合并 + 上行经真实 UI 新增记录进入 PATCH body，共 **8 PASS / 0 FAIL**。
② 未知路径离线回退——SW 激活 + 16 项预缓存后离线导航未知路径，按 `NAV_MAP` 回门户；
已知路径离线分别回明信片 / 海报墙，**8 PASS / 0 FAIL**。
诚实披露：Gist 为浏览器内 fetch 层 mock 隔离验证，非真实 GitHub Token 往返；
触控为视口模拟（`agent-browser device` 不改 `maxTouchPoints`），非真机手势；
Firefox 未安装、Safari 远程自动化需管理员授权，均未做真机。
执行记录与证据：`deliverables/workbench-audit-1105/主题按钮统一与剩余验证执行报告_20261116.md`。

2026-11-15 起回归 **49 PASS / 0 KNOWN / 0 FAIL**（新增 `_测试/站点_P1P2修复_20261115.冒烟测试.mjs`，
覆盖月末翻页、收件箱批量改日期、媒体卡转义、观后感键、星级条、云同步文案、弹窗无障碍等 8 项修复分支；
用改前备份 `WB_REPO` 做对照实验：**改前 29 FAIL / 改后 39 PASS / 0 FAIL**）。
2026-11-13 基线回归 **48 PASS / 0 KNOWN / 0 FAIL**：6 项失效探针按当前 IIFE 结构真修复
（`_ops/_workbench/probe_inject.mjs` 统一注入点；两套误读 `PC_HTML` 的冒烟脚本改读 `TH_HTML`），
2 项 jsdom 焦点限制的运行时断言迁至 `focus_trap_e2e.py`（真实 Chrome）；
2026-11-15 起扩展到海报墙三个弹窗（cloudMask / formMask / 动态 confirmWall），含背景锁滚与归还焦点。
jsdom 侧那 6 条断言改为输出显式 `SKIP`（**不伪装成 PASS**），报告逐条列出并指向 E2E。
白名单 `regression-known-limits.json` 现为空；任何未列入白名单的失败仍让退出码非零。
2026-11-15 P1+P2 修复（8 项必修复）执行记录与证据：`deliverables/workbench-audit-1105/P1P2修复执行报告_20261115.md`。
证据在 vault `deliverables/workbench-audit-1105/qa/evidence/`（`focus-trap-e2e-*.txt`、
`known-fix-contrast-*.txt`、`w01-*`、`w04-*`、`w05-*`、`w02-*`、`w10-*`、`w13-*`、`w06-*`）。

2026-11-17 第一批 P1（用户「先帮我做第一批」，来源全站审查报告三条数据正确性缺陷）：
① **P1-1 任务台云上传漏合并次级集合**——上传读回后原先只并 `tasks` / `habits` / `media`，
`lists` / `cats` / `tagTree` / `pris` / `projects` / `okrs` / `anniv` 会被紧随其后的 `syncPayload()`
整包写回覆盖，跨设备新建的项目/目标/清单在下一轮上传后丢失。改为读回后调用既有
`mergeCloudSecondaryUnion(o2)`（只补「云端有本地缺」并保留本地同名项，幂等、不反向覆盖）。
② **P1-2 明信片墓碑仲裁**——`tombMap` 把 `moved[id]=…` 写在时间戳仲裁块**之外**无条件执行，
导致时间戳更旧的 `move` 墓碑架空新 `delete`（已删记录复活），或更旧的 move 覆盖更新的 move
（记录错位到目标数组）。改为 move 登记随胜出墓碑一起仲裁，胜出者非 move 时 `delete moved[id]`。
③ **P1-3 海报墙分页重叠**——旧 `pageSlice` 每页独立把 `end` 向后扩到类型块边界，但下一页
`start` 仍固定 `(p-1)*S`，相邻页区间重叠。实测真实 1731 条 S=48 时 146 条重复、S=24 时 199 条。
改为 `computePageBounds()` 一次性顺序推导连续页边界（上一页 end = 下一页 start），
`pageOfIndex` / 自动续页判断 / 翻页条页数统一走同一口径。
实施中发现并入 `mergeCloudSecondaryUnion` 会让其内部 `*Save()` 在上传忙锁内再次排队，
把刚清掉的 `_pendingUpload` 重新置位成「幽灵待传」——补 `_suppressCloudAuto` 窄范围抑制开关
（合并结果已由随后 `syncPayload()` 整包写回承载，无需再排一次上传）。
新增 `_测试/站点_第一批P1_20261117.冒烟测试.mjs`（36 条断言；改前对照 **17 PASS / 19 FAIL**，
对当前源码与改前备份双跑结果一致，证明测试不是空跑）。
另修复 `明信片追踪_第3批_逻辑断言.cjs` 的时区抖动：原用 `toISOString()`（UTC）取日期、
应用用本地日期，在 CST 00:00–08:00 会差一天而误报（CST 58/1、TZ=UTC 59/0 已实证，改为本地日期后两时区均 59/0）。
本轮最终门禁：全量回归 **55 PASS / 0 KNOWN / 0 FAIL**、焦点 E2E **36 PASS / 0 FAIL**、镜像 23 项一致、
P1-9 分层守卫 **42 PASS / 0 FAIL**（`_cloudUploadInner` / `cloudAutoUpload` / `tombMap` 合法重冻）、
真浏览器三处修复 **9 PASS / 0 FAIL**（含四页零 JS 错误）。升 `APP_CACHE` v12 → **v13**。
执行记录与证据：`deliverables/workbench-audit-1105/第一批P1修复执行报告_20261117.md`。

## 2026-11-17 P2 批（全站审查 11 项一般优化，已上线）

- **P2-1** 明信片残缺 CSS 注释（裸文本带 `*/`）吞掉暗色 `.cloudpill.off` 规则 → 补成合法注释；真浏览器 CSSOM 实证背景由 `rgb(233,237,245)` 变为 `rgb(35,42,58)`。
- **P2-2 / P2-3** 任务台批量取消 / 补打卡漏写 `habitday` 墓碑与 `dayTs` → 与单格打卡 / 本周清空同口径（取消删时刻 + 写墓碑，补卡写时刻 + 清墓碑）。
- **P2-4** 周目标双口径 → `habitFitRate()` 对 weekly 改用 `habitWeekGoal()` / `habitWeekCount()` 的本周任意 N 天口径，与「3/3 达标」一致；`habitWeekTargetDays()` 的前 N 天明确降级为「补卡建议日」。
- **P2-5** 月度重复任务起始日 29/30/31 在短月静默跳过 → `want = Math.min(baseStart.getDate(), 当月天数)` 钳制。
- **P2-6** 「进行中」虚高 → `droppedCount` 用 `isDropped(t, todayYmd)` 纳入重复任务当日 skip。
- **P2-7** 海报墙评分 0 / 负数 / 非数字只提示不阻断 → `toast + focus + return`。
- **P2-8** 感想删除后云端旧副本复活 → 删除写 `{_del:true,ts}` 墓碑，合并规则允许无 text 的墓碑参与 ts 仲裁，`hasReview` / 时间显示跳过墓碑；待认领删除同步改墓碑。
- **P2-9** home 暗色 FOUC → head 内 `<style>` 之前加同步主题脚本，html 去掉硬编码 `data-theme="light"`。
- **P2-10** 移动端触控目标 → 导航链接 `inline-flex + min-height:44px`、品牌与 home `.btn` 移动端 44px（改共享源后重注入五页）。
- **P2-11** 提醒可靠性落差 → 提醒按钮 title / 习惯提醒时间说明 / SW 注释明确「仅在页面或后台脚本活跃时尽力提醒，关闭页面后不保证准时送达」。

新增 `_测试/站点_P2批_20261117.冒烟测试.mjs`（33 条断言；改前对照 **6 PASS / 27 FAIL**，证明非空调）。
P1-9 守卫因 5 个函数体合法改动重冻基线（改前字节 40 PASS / 0 FAIL → 重冻后 42 PASS / 0 FAIL）。
`站点_遗留风险修复_20261116.冒烟测试.mjs` 的 B6 断言适配 P2-8 墓碑语义（改前 25 PASS / 1 FAIL → 改后 26 PASS / 0 FAIL）。
本轮最终门禁：专项 **33 PASS / 0 FAIL**、全量回归 **56 PASS / 0 KNOWN / 0 FAIL**、焦点 E2E **36 PASS / 0 FAIL**、P1-9 守卫 **42 PASS / 0 FAIL**、真浏览器 P2 实证 **9 PASS / 0 FAIL**。升 `APP_CACHE` v13 → **v14**。
执行记录与证据：`deliverables/workbench-audit-1105/P2批修复执行报告_20261117.md`。

## 2026-11-18 P3 第一梯队（全站审查 6 项一般优化，已上线）

- **P3-1** 任务台习惯 emoji 经 `innerHTML` 裸插（热力图同数据却转义）→ `habitRowHtml()` 改用 `esc(h.emoji||"🌟")`；真浏览器注入 `<img src=x onerror=...>` 后无子节点、无注入。
- **P3-2** 768–860px 断点 `.wrap{padding:14px 20px 0}` 把底部安全区重置为 0 → 改为 `padding:14px 20px calc(16px + env(safe-area-inset-bottom,0px))`；800px 视口实测 `padding-bottom:16px`。
- **P3-3** 批量打卡 0 变化仍弹「已补打 0 个」→ 按 `total>0` 分支，0 变化提示「所选日期均已打卡，无变化」。
- **P3-4** home 刷新按钮恢复定时器未 `clear` → 保存并清理句柄，快速双击后 1.45s 仍显示「已刷新 ✓」。
- **P3-10** 海报墙统计卡固定 3 列 + 第 4 张心愿卡成 3+1 孤行 → 有心愿卡时 `.stats.with-wish` 切 2×2，≤560px 回落单列；实测 4 卡 2 列。
- **P3-11** 海报二次加载失败丢失类型专属渐变 → 重试前读出 `--g`，重试 `onerror` 写回；实测二次失败后 `.ph` 与渐变均恢复。

新增 `_测试/站点_P3第一梯队_20261118.冒烟测试.mjs`（26 条断言；改前对照 **10 PASS / 16 FAIL**，证明非空调）。
P1-9 守卫因 `confirmHabitBackfill` / `habitRowHtml` 两函数体合法改动重冻基线（改前字节 40 PASS / 0 FAIL → 重冻后 42 PASS / 0 FAIL）。
本轮最终门禁：专项 **26 PASS / 0 FAIL**、全量回归 **57 PASS / 0 KNOWN / 0 FAIL**、焦点 E2E **36 PASS / 0 FAIL**、P1-9 守卫 **42 PASS / 0 FAIL**、真浏览器 P3 实证 **16 PASS / 0 FAIL**。升 `APP_CACHE` v14 → **v15**。
执行记录与证据：`deliverables/workbench-audit-1105/P3第一梯队修复执行报告_20261118.md`。

## 2026-11-18 P3 第二/三梯队（全站审查剩余 11 项，已上线）

- **P3-5/6/7**（home）陈旧注释更正；兜底缓存 total 补上自定义条目数，权威/fallback 两来源口径统一，标签固定「已记录（含自定义 / 代查）」；`render(keepTime)` 让兜底抓取只更新媒体数、不重写 `ovTime`。
- **P3-8/9**（明信片）`convertRecord` 清理镜像腿 `pairId` 后补 `touch(o)`，与 `unlinkPartnerIfOrphan` 对齐；单向代寄 `envSent`/`envRecv` 归入既有 5 态桶，Σ 与总张数一致。
- **P3-12/13/14/15**（海报墙）心愿小节题材计数只用心愿条目；题材偏好 TOP14 排除心愿单；表单脏检查补 `fDate`/`fStatus`、chip 键盘激活重置翻页计数、搜索同词不重复全量重建且防抖 120→200ms；自定义条目卡片带稳定 `data-cid`，详情保存按语义标记定位而非隐式数组顺序。
- **墓碑增长**：感想删除墓碑加 90 天 TTL，在 `saveReviews()` 与启动时统一收敛超期墓碑（近期墓碑保留，防复活能力不变）。
- **卡片内部触控补漏**：三页新增 `#p3-touch-fix`，≤680px 下卡片内部小按钮补齐 `min-width/min-height:44px`（沿用 P2-10 导航口径）。

新增 `_测试/站点_P3第二三梯队_20261118.冒烟测试.mjs`（58 条断言；改前对照 **11 PASS / 47 FAIL**，证明非空调）。
P1-9 守卫因 `convertRecord` / `renderStats` 函数体合法改动重冻基线（改前字节 40 PASS / 0 FAIL → 重冻后 42 PASS / 0 FAIL）。
`站点_低风险批_20261116.冒烟测试.mjs` 的 4.2/4.3/4.4 断言适配 P3-6 口径统一（改前 19 PASS / 3 FAIL → 改后 22 PASS / 0 FAIL）；
`站点_遗留风险修复_20261116.冒烟测试.mjs` 的 B6 把「换键 delete」按 `migrateReviews` 函数体核对，避免与 TTL 收敛的 `delete reviews[k]` 混淆。
本轮最终门禁：专项 **58 PASS / 0 FAIL**、全量回归 **58 PASS / 0 KNOWN / 0 FAIL**、焦点 E2E **36 PASS / 0 FAIL**、P1-9 守卫 **42 PASS / 0 FAIL**。升 `APP_CACHE` v15 → **v16**。
执行记录与证据：`deliverables/workbench-audit-1105/P3第二三梯队修复执行报告_20261118.md`。

## 发布流程

改源码（含 `_shared/modal-a11y.js`）→ 重新注入四块 → 同步 `index.html` → 同步 `pc-app` / vault `Projects/` 镜像 → `./check.sh --full` → commit & push →
等 Pages 构建（`sw.js?cb=<时间戳>` 轮询版本号，注意 10 分钟磁盘缓存）→ 线上 18 个文件 MD5 比对 →
真浏览器 E2（亮/暗、390×844）。

## 本机副本

- `~/.workbuddy/publish/tools-site` = 本仓库（唯一发布源码）。
- `~/.workbuddy/publish/pc-app` = 回归测试镜像，25 套脚本硬编码读它，必须与本仓库同版。
- vault `Projects/` = Obsidian 内的本地阅读副本（2026-11-13 已同步为 7e85231）。
  双击打开是 `file://`，localStorage 与线上不同源、数据不互通，日常使用请走线上 URL。
