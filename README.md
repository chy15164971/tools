# 工作台站点（tools）

单文件零依赖 HTML 工作台：门户 `home.html` + 六个子应用（任务管理台 / 明信片追踪 / 书影音海报墙 / 观剧记录 / 旅行地图 / 时间线）。
本地优先 localStorage，GitHub Gist 为可选云同步，无账号体系、无后端。

线上：https://chy15164971.github.io/tools/home.html
仓库：`chy15164971/tools`，主分支 `main`。本仓库即发布仓库，push 后 GitHub Pages 自动构建。

## 发布契约（改动前必读）

1. **`index.html` 必须逐字节等于 `任务管理台.html`**。改完任务台后执行
   `cp 任务管理台.html index.html`，否则用户从根路径进入的是旧版。
2. 八页的共享代码由 `_shared/inject_shared.py` 注入五块：`SHARED`（任务台/明信片/index）、
   `SITE-NAV-HTML`（八页）、`SITE-NAV`（八页）、`MODAL-A11Y`（任务台/明信片/index/海报墙）、
   `TIMELINE-CORE`（时间线/首页，事件解析唯一源）。共 25 个内联块，发布门禁逐字节比对。
   **不要在页面里直接编辑标记区内的内容**，改源文件 `shared.js` / `site-nav-static.html` /
   `site-nav.js` / `modal-a11y.js` 后重新注入。
   ⚠️ `MODAL-A11Y` 是弹窗无障碍 IIFE 的**唯一真相源**（2026-11-16 收敛，此前 shared.js 与
   海报墙各有一份手抄副本）。四页都由 `a11y_src()` 生成，发布门禁逐字节比对；
   **只改源文件不重注入 = 门禁报红**。海报墙因 `confirmWall` 动态插入需要 `childList=true`，
   其余三页为 `false`；门户 `home.html` 无弹窗不注入。整份 `shared.js` 仍**不可**注入海报墙/门户。
   导航条必须是 `<body>` 开头的静态 HTML，不能退回 JS 延迟插入（会重现首屏闪旧画面）。
3. 共享色板唯一真相源是 vault `_ops/_workbench/design_tokens.css`；
   私有变量写在 `SHARED TOKENS START/END` 标记区**之外**，否则下次同步会被整块覆盖。
4. **改任何 HTML 字节都要升 `APP_CACHE` 版本号**（当前 v31）：SW 字节不变就不触发 install，
   已安装 PWA 会继续从旧预缓存读页面（2026-11-13 v6、11-15 v7、11-16 v8→v9→v10→v11→v12、11-17 v13→v14、11-18 v15→v16→v17、11-19 v18、11-21 v19→v20→v21、11-22 v22→v23→v24→v25→v26→v27→v28→v29→v30→v31 均按此处理）。
   导航请求用 `fetch(url,{cache:"no-store"})` 绕过 Pages 的 `max-age=600`；
   不要写成 `fetch(e.request, init)`（navigate 模式重建 Request 会抛 TypeError）。
5. `_shared/` 目录以下划线开头，GitHub Pages 不发布；源文件已内联进八个 HTML，线上 404 属预期。

## 一键校验

```bash
./check.sh              # 1–3 步：发布门禁 + token 一致性 + 回归镜像一致性（秒级）
./check.sh --full       # 再加 4–5 步：全量回归 + 焦点陷阱真浏览器 E2E（约 5 分钟）
```

| 检查 | 命令 | 作用 |
|---|---|---|
| 发布门禁 | `python3 _shared/verify_release.py` | 7 项：index 契约、17 个内联块、导航块位置、tokens、PRECACHE、品牌链接、**弹窗无障碍唯一源守卫** |
| 色板同步 | `node "$VAULT/_ops/_workbench/sync_tokens.js" --check --repo .` | 五页 SHARED TOKENS 与 design_tokens.css 一致 |
| 全量回归 | `python3 "$VAULT/_ops/_workbench/run_regression.py"` | 59 个用例；0 未解释失败才算通过 |
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

## 2026-11-18 三点权衡加固（诚实披露项进一步加固）

- 背景：P3 第二/三梯队执行报告诚实披露三点权衡（墓碑 90 天 TTL 离线复活边界、触控补漏范围、搜索 200ms 防抖非虚拟滚动），本轮逐项加固。
- **墓碑复活边界**：新增 `REVIEW_TOMB_HARD_TTL=730 天`；`pruneReviewTombs()` 改为双层墓碑——90 天强墓碑降级为轻量墓碑 `{_del:true,ts,_weak:1}`（保留 key 与 ts 继续参与云同步并集合并与 ts 仲裁，正文裁剪控制体积），仅 2 年硬上限才真删。真浏览器实测：100 天墓碑降级、800 天真删、1 秒前保留。
- **触控补漏范围**：390px 真浏览器扫描三页，补齐 `<44px` 控件中的按钮/筛选/表单类（`.chip/.vtab/.mini-btn/#btnTheme/#densBtn/#btnMenu/.menu-close/select/.search-clear/.btn-reset` 等），并修正 `.filterbar .fsel` / `.filters select` 优先级冲突（同级规则覆盖，不用 `!important`）；日历密集时间 chip 刻意保持原尺寸避免月视图布局破坏。home 实测 0 遗漏。
- **搜索防抖**：`haystackOf()` 改用对象 `_hay` 预计算缓存，换词/筛选不再对 1731 条反复拼接字符串与 toLowerCase；真浏览器实测命中 23 条只挂载 23 卡，DOM 规模受 pageSize（移动端 24 / 桌面 48）约束，非 1731 张全量灌入。
- 新增 `_测试/站点权衡加固_20261118.冒烟测试.mjs`（42 断言；改前 23 PASS / 19 FAIL，证明非空调）。P1-9 守卫无需重冻（改动函数不在守卫集），42 PASS / 0 FAIL。
- 本轮最终门禁：专项 **42 PASS / 0 FAIL**、全量回归 **59 PASS / 0 KNOWN / 0 FAIL**、焦点 E2E **36 PASS / 0 FAIL**、P1-9 守卫 **42 PASS / 0 FAIL**、真浏览器 **25 PASS / 0 FAIL**。升 `APP_CACHE` v16 → **v17**。
- 执行记录与证据：`deliverables/workbench-audit-1105/权衡加固执行报告_20261118.md`。

## 2026-11-19 媒体进度看板「不看 / 不听 / 不读」放弃功能

- 用户诉求：进度看板卡片增加放弃选项；澄清后采用「卡片加放弃按钮」方案。
- 实现：不删条目，只打 `abandoned:true`；卡片移入各列独立的「⊘ 已放弃 N」分区，退出在追统计与平均进度；显示灰化态、虚线「已放弃」徽标、原进度提示与「↺ 恢复」按钮；文案随类型变化（不读 / 不看 / 不听）；与完成态正交。`mediaSig()` 纳入 `abandoned` 保证放弃态走云同步。
- 本轮最终门禁：专项 **29 PASS / 0 FAIL**（改前对照 1 PASS / 28 FAIL）、全量回归 **60 PASS / 0 FAIL**、焦点 E2E **36 PASS / 0 FAIL**、P1-9 守卫改前字节对照 **40 PASS** 且重冻后 **42 PASS / 0 FAIL**、媒体放弃真浏览器 E2E **28 PASS / 0 FAIL**。升 `APP_CACHE` v17 → **v18**，commit `c497046`，线上 3/3 MD5 MATCH。
- 边界：放弃是软状态（仍占存储、仍同步）；三列各有独立已放弃分区；放弃不写墓碑；线上首次访问 SW controller 为空属正常时序。
- 执行记录与证据：`deliverables/workbench-audit-1105/媒体放弃功能_执行报告_20261119.md`。

## 2026-11-21 观剧记录上线 + 地点日记（原型）

- 用户诉求：旅行地图地点写日记传照片；记录现场观剧次数并给剧目建议。架构经澄清确认：日记并入地图 / IndexedDB 存照片 / 内置剧目库本地推荐 / 观剧独立页 + 海报墙入口。
- 旅行地图新增地点日记：IndexedDB `wb_travel_diary_db`（diaries + photos），每地点旁「日记 N」按钮，支持 CRUD、缩略图、原图查看、删除级联；日记按钮与点亮事件隔离。
- 新建独立页 `观剧记录.html`：localStorage `wb_theatre_v1` + IndexedDB `wb_theatre_db`；四视图（记录 / 统计 / 想看 / 推荐）；28 部内置剧目库 + 本地加权推荐，`normName()` 去重含「二刷」后缀；统计含观演次数 / 剧院 / 票价 / 平均票价。
- 海报墙 top-actions 加 `🎭 观剧记录` 入口（仅本页 `sib-link`，未动统一导航条）；观剧页加 `‹ 海报墙` 返回链接。
- 验收：地点日记专项 28 PASS、城市版回归 74 PASS、观剧专项 32 PASS / 0 FAIL；变异测试三处均触发预期失败；真浏览器 E2E 19 项全过、0 报错，桌面 / 移动端截图落盘。
- 执行记录与证据：`deliverables/workbench-audit-1105/地点日记与观剧记录_执行报告_20261121.md`。

### 观剧记录完整并入站点（v19）

- 用户选择「完整并入站点」：观剧记录成为第六个正式页面，接入统一导航条（「观剧」项 + `data-page="theatre"` 高亮）、PWA precache（`PRECACHE` + `NAV_MAP`）、发布门禁与 manifest shortcuts。
- 共享层口径升级：注入器 / 门禁页面清单五页 → 六页，共享内联块 17 → 19，`sync_tokens.js` 纳入观剧页；观剧页原私有 token 收敛为仅 `--warm`，其余走共享 token 唯一源。
- 陈旧断言更新：媒体放弃 F1、权衡加固 D7 的版本断言改为「≥v18」，遗留风险 A8 门禁块数 17→19；P1-9 守卫因导航函数体合法变化触发 G10，已用改前字节对照 40 PASS 证明分辨力，重冻后 42 PASS / 0 FAIL（旧基线备份 `_P1-9基线_改前_v18.json`）。
- 本轮门禁：发布门禁 0 失败、TOKENS 六页 IN_SYNC、镜像 23 项可跑、全量回归 **63 PASS / 0 FAIL**、焦点 E2E 36 PASS / 0 FAIL；真浏览器验证六页导航条、观剧 CRUD/统计/推荐去重、v19 预缓存、海报墙↔观剧往返、离线回退、390px 无溢出，0 报错。升 `APP_CACHE` v18 → **v19**。
- 状态：观剧记录已上线。

### 旅行地图（含地点日记）并入站点（v20）

- 用户选择「我提供 key」：旅行地图成为第七个正式页面，接入统一导航条（「地图」项 + `data-page="map"` 高亮）、PWA precache（`PRECACHE` + `NAV_MAP`）、发布门禁与 manifest shortcuts。
- **地图加载改造**：删除 WorkBuddy 本地代理 `_TMapSecurityConfig.serviceHost`（占位符仅运行时替换，线上必空白），改标准 key 加载 `map.qq.com/api/gljs?v=1.exp&key=<用户自备 key>`；key 由用户提供，需申请 JavaScript API GL 类型并把 `chy15164971.github.io` 加入域名白名单。真浏览器实证：TMap API 加载为 object、地图 canvas 渲染（937×491）、点亮 Marker 生效。
- 共享层口径升级：注入器 / 门禁页面清单六页 → 七页，共享内联块 19 → 21，`sync_tokens.js` 纳入旅行地图；地图页 token 收敛为 SHARED TOKENS 标记区（走共享唯一源），无私有变量残留。
- 陈旧断言更新：媒体放弃 F1 / 权衡加固 D7 的版本正则已覆盖 v20（`[2-9]\d`）；低风险批 5.2 正则放宽为 `[1-9][0-9]`；遗留风险 A8 门禁块数 17→21（本轮 19→21）；P1-9 守卫因导航函数体合法变化触发 G10，先用改前字节 `--old` 对照 39 PASS 证明分辨力，备份旧基线 `_P1-9基线_改前_v19.json` 后重冻，工作区 42 PASS / 0 FAIL。
- 本轮门禁：发布门禁 0 失败、TOKENS 七页 IN_SYNC、镜像 23 项可跑、全量回归 **63 PASS / 0 FAIL**、焦点 E2E 36 PASS / 0 FAIL、上线专项真浏览器 E2E **22 PASS / 0 FAIL**（导航高亮、无代理残留、34 省/46 城、日记 CRUD、点亮持久化、事件隔离、390px 无溢出）。升 `APP_CACHE` v19 → **v20**。
- 状态：旅行地图与地点日记均已上线；日记照片存本机 IndexedDB，不与 Gist 同步；密集城市 Marker 重叠可能误触邻城（延续边界）。

## 发布流程

改源码（含 `_shared/modal-a11y.js`）→ 重新注入四块 → 同步 `index.html` → 同步 `pc-app` / vault `Projects/` 镜像 → `./check.sh --full` → commit & push →
等 Pages 构建（`sw.js?cb=<时间戳>` 轮询版本号，注意 10 分钟磁盘缓存）→ 线上 18 个文件 MD5 比对 →
真浏览器 E2（亮/暗、390×844）。

### 批一「必须修复」（v21，commit `a27a079`，2026-11-21）

- 依据 `全站审查报告_20261121.md` 第一批：M-1 地图引擎加载失败降级（顶层守卫 + onerror + 清单/日记解耦）、M-2 地图 localStorage 读写失败 toast 反馈、M-3 观剧记录导出/导入备份（含照片 base64）、M-4 任务台 `dataSig` 次级集合纳入内容签名（修跨设备漏同步）、M-5 观剧日期改本地拼接（修东八区跨日错位）。
- 专项 **26 PASS / 0 FAIL**（改前 3 PASS / 23 FAIL）、全量回归 **63 PASS**（唯一 FAIL 为同步前 G13，同步后 P1-9 复测 42 PASS / 0 FAIL）、焦点 E2E **36 PASS / 0 FAIL**。
- P1-9 守卫因合法改动触发 G4/G5/G9/G10，先用改前字节 `--old` 对照 40 PASS 证明分辨力，备份 `_P1-9基线_改前_v20.json` 后重冻。
- 升 `APP_CACHE` v20 → **v21**，线上 9/9 核心文件 MD5 MATCH。执行报告 `deliverables/workbench-audit-1105/批一必须修复_执行报告_20261121.md`。

### 批二「建议优化」（v22，commit `8969472`，2026-11-22）

- 依据 `全站审查报告_20261121.md` 第二批落地 14 项（C-4 keepalive 补传经核实属有意设计权衡，保持现状并披露）：
  - 地图 S-1~S-6：日记弹窗轻量焦点锁 / Tab 回环 / 滚动锁 / 焦点归还（列表重建后按 pid 重新查询）、填表清 `pendingPhotos` 防串档、submit 等待异步缩略图、保存幂等锁、>12MB 照片闸门、列表重绘焦点恢复。
  - 观剧 S-7~S-11：表单脏检查、推荐双向去重、原生 `confirm/prompt` → Promise 化弹窗、删除 8 秒撤销（含照片 Blob）、票价 0~100000 校验。
  - 海报墙 C-1/C-2：导入感想按 ts 仲裁并纳入墓碑（对齐云同步口径）、`saveCustom` 返回写入状态且调用方门控成功文案。
  - 明信片 C-3：`exportCSV` 延迟 1s revoke（对齐 `exportJSON`）。
- 专项 **26 PASS / 0 FAIL**（改前对照 0 PASS / 26 FAIL）；观剧验收 **32 PASS**（陈旧断言同步更新）；地图验收 **74 PASS**；全量回归 **64 PASS / 0 FAIL**；焦点 E2E **36 PASS**；P1-9 守卫改前字节对照 40 PASS、重冻后 **42 PASS / 0 FAIL**（备份 `_P1-9基线_改前_v22.json`）。
- 真浏览器实证：观剧新弹窗 / 票价校验 / 脏检查 / 删除撤销，地图焦点锁与归还 / 12MB 闸门 / 390px 无溢出，全部通过；过程中修复两个真机才暴露的缺陷（事件对象误当 `force` 跳过脏检查、DOM 重建导致焦点归还失效）。
- 升 `APP_CACHE` v21 → **v22**，线上 5/5 核心文件 MD5 MATCH。执行报告 `deliverables/workbench-audit-1105/批二建议优化_执行报告_20261122.md`。

### 批三「可选增强」（v23，commit `ff02485`，2026-11-22）

- 依据 `全站审查报告_20261121.md` 第三节 O-1~O-9。**开工前核实发现 5 项与报告描述不符**，为避免无效改动先做取舍：
  - **O-2 海报墙年份/星级图、O-3 任务台 `#标签/p0-3/@情境` 自然输入、O-8 地图世界模式搜索：均已实现**，本轮改为专项测试里的「防回退守卫」断言（O2-1/2、O3-1/2/3、O8-1/2）。
  - **O-4 预缓存 TMap 引擎、O-6 死代码清理：评估后不做**。前者因 key 鉴权必须联网、opaque 响应入库会放大 install 失败面而收益为负；后者 `iconify/EMOJI_ICON` 是注释明确约定的预留 API，跳转壳 `meta refresh` 是禁 JS 场景唯一手段。理由见执行报告第四节。
- 实际改动三项：
  - **O-1 观剧新增「观演日历」第 5 个 tab**：7 列周网格（周一为首）、`calMap()` 按日期聚合同日多场、有观演格子加圆点/`is-today`/`sel`、`‹ ›` 年月切换、点日期在下方用 `recHtml` 复用既有编辑删除委托；无障碍补 `role=button` + `tabindex` + `aria-label` **以及 Enter/Space `keydown` 激活**。
  - **O-5 `vh → dvh`**：补 `home.html` 与旧链接跳转壳 `媒体进度看板.html`（保留 `100vh` 回退）；五个主页面此前已无裸 `100vh`。
  - **O-7 主题初值统一（本轮唯一真实缺陷）**：观剧页与地图页**此前完全没有主题初始化**（只有暗色 CSS 变量，从不读 `wb_theme_v1`），用户选过暗色后跳过去会变回亮色；两页补首屏脚本，任务台/明信片补「无显式选择时跟随系统」，海报墙修「系统暗色 + 显式亮色」的首屏闪暗。统一口径：显式键优先 → 无值跟随系统 → 默认亮色。
  - 额外修正：日历文字色从 `--pri-deep` 改 `--pri-ink`（主色当文字的既有约定），实测对比度亮 4.15→**4.80**、暗 3.14→**6.68**，本月数字 5.48 / 7.63，均达 AA 4.5:1。
- 专项 `_ops/_测试/站点_批三可选增强_20261122.冒烟测试.mjs` **27 PASS / 0 FAIL**（改前对照 **10 PASS / 17 FAIL**，其中 10 条为已实现项的守卫断言）；全量回归 **66 PASS / 0 FAIL**；焦点 E2E **36 PASS**；P1-9 守卫 **42 PASS / 0 FAIL**（未触发重冻）。
- 期间修复三份验收测试的脆弱假设（`html.match(/<script>/)` 取「第一个」块 → 改为按 `const KEY=` 特征定位），断言内容未变，修复后 32 / 74 / 28 全绿。
- 升 `APP_CACHE` v22 → **v23**。执行报告 `deliverables/workbench-audit-1105/批三可选增强_执行报告_20261122.md`；结构评估 `deliverables/workbench-audit-1105/O-9单文件结构评估_20261122.md`。
- ⚠️ 真浏览器坑记录：`agent-browser media dark` **静默无效**（`matchMedia` 仍返回 light），验证「跟随系统」须用启动参数 `--color-scheme dark`。

### 首页补齐五页入口 + 观剧页返回按钮移除（v24，commit `aea9023`，2026-11-22）

- **首页长期停留在「三页时代」**：卡片只有任务台/明信片/海报墙，标题与副标题写「三个页面共用一个入口」，概览只有 4 格——观剧与旅行地图在 v19/v20 上线后**始终没有首页入口**，只能靠顶部导航条进入。
- 改动：
  - **卡片 3 → 5**：新增「观剧记录」（观演场次 / 想看 / 去过的城市）与「旅行地图」（中国省份 / 中国城市 / 世界足迹）。
  - **布局**：`.grid` 由 3 列改 **6 栏基座**——前三张 `span 2`（一行三张），后两张 `.card.wide` `span 3`（一行两张）；用显式类而非 `:nth-child`，卡片顺序调整不会破版。820px 断点重置跨度为 auto 并让第 5 张整行，560px 单列；同时删掉三卡时代遗留的 `.grid .card:nth-child(3){grid-column:1/-1}`。
  - **概览 4 → 6 格**（`repeat(3,1fr)` 两行），新增「观剧数据状态」「地图点亮状态」；合计口径改为五项之和。地图副行单独用「已点亮 · 共 N 处」，不用「条」。
  - **新增 `summaryTheatre()` / `summaryMap()`**：读 `wb_theatre_v1` 与 `wb_travel_map_v1`；城市按记录 `city` **去重且忽略空白**，世界足迹 = `worldCountries + world` 两层相加（地图是二级结构，同一地点只记在对应层级）。`renderOverview` 签名扩为 `(t,p,m,th,mp,keepTime)`，`keepTime` 仍在末位。
  - 文案统一五页口径；foot 补诚实披露「观剧与地图目前只存本机，不走 Gist」。
  - **观剧页删除头部 `‹ 海报墙` 按钮**：与一级导航条重复；海报墙侧 `sib-link` 观剧入口与导航条「海报墙」链接均保留，不造成断路。
  - **顺带修既有缺陷**：老三个卡片图标亮色前景对比度只有 4.15 / 3.41 / 3.61（均不达 AA），与新卡 4.86 / 4.77 并排显深浅不一；改为 `#2F5FE0 / #b23c62 / #6d3fd6`，实测 **4.80 / 4.91 / 5.37**，暗色原本 6.53+ 未动。
- 专项 `_ops/_测试/站点_首页与观剧调整_20261122.冒烟测试.mjs` **57 PASS / 0 FAIL**（改前对照 **10 PASS / 47 FAIL**，10 条均为防回退守卫）。其中 19 条是 **jsdom 真跑首页脚本**的行为断言（注入假数据验证去重/分层/合计/空态显示「—」），不是纯字符串匹配。
- 全量门禁 `check.sh --full` **EXIT=0**：全量回归 **67 PASS / 0 FAIL**、焦点 E2E **36 PASS**、P1-9 守卫 **42 PASS**（未触发重冻）、共享块 21/21、七页 TOKENS IN_SYNC。
- 期间修正两条**陈旧断言**（非缺陷）：`站点_P3第二三梯队` C2 的 `renderOverview(t,p,m,keepTime)` 签名断言改为 6 参版本；`站点_批三可选增强` V-1 原写死 `v23` 改为「不低于 v23」，避免每次升级都误报。
- 升 `APP_CACHE` v23 → **v24**。

### 旅行地图世界国家层补全（v25，2026-11-22）

- **问题**：世界地图一直只有 22 个国家（日韩新泰马印尼越 + 英美法意德瑞西俄土阿联酋埃及 + 美加澳新巴西），约为主权国家总数的 11%。欧洲缺荷兰/葡萄牙/希腊/北欧全境、亚洲缺印度/菲律宾/柬埔寨、非洲只有埃及、南美只有巴西——是 v20 上线时按「国人常去目的地」手工挑选留下的，不是全量。
- 改动：
  - **国家 22 → 194**：联合国会员国 193 + 观察员国 2（梵蒂冈、巴勒斯坦）= 195 主权国家，扣掉中国本身（已有独立中国专区，避免重复计数）。**不含海外领地与属地**（格陵兰、波多黎各、关岛、法属波利尼西亚等），港澳台一律按中国的一部分处理，不进入世界国家列表。
  - **城市 46 → 146**：覆盖 85 个国家的旅行热点城市，其余 109 国走「国家」层点亮；城市模式 hint 明确写了这层边界。城市 id 与原有 46 个逐字保留，已点亮记录不受影响。
  - **国家模式开放搜索**：原来搜索框只在城市层显示（`searchwrap` 的 toggle 只判 `isCity`），194 个平铺无法浏览。现在世界国家模式也显示，支持**中文名 / 英文名 / 两位国家码**三通道匹配（`hit()`），中国省份模式（34 个）仍隐藏。
  - **按大洲分组**：亚洲 47 / 欧洲 44 / 非洲 54 / 北美洲 23 / 南美洲 12 / 大洋洲 14，组头显示本洲 `已点亮 / 本洲数`。
  - **搜索时地图标记同步过滤 + 自动定位**：命中唯一结果时飞过去并 `setZoom(5)`（260ms 防抖）。这是对「195 个圆点在世界视图 zoom 3 下密集重叠点不到」的正面缓解——本页点亮仍是中心点 Marker 而非国界填色（用户此前明确决定不做填色）。
  - dim Marker 由 22px 缩到 20px，进一步降低重叠误触（lit 保持 32px，已点亮的是回看对象，优先保证可见性）。
- **顺带修掉一个既存缺陷**：`CHINA` / `CN_CITIES` 的 id 与 ISO 国家码有 **33 处撞车**（`es` 既是恩施又是西班牙、`sg` 韶关/新加坡、`my` 绵阳/马来西亚、`pt` 莆田/葡萄牙、`sd` 山东/苏丹、`bj` 北京/贝宁…），而 `findPlace()` 用 `concat(CHINA,CN_CITIES,WORLD_COUNTRIES,WORLD).find(x=>x.id===pid)` 取第一个命中——给西班牙写的地点日记，恩施的按钮也会跟着 +1。做法：
  - 给每张表条目挂带表前缀的唯一键 `k`（`c:` 省份 / `cc:` 中国城市 / `w:` 国家 / `wc:` 世界城市），日记外键只认 `k`；`state` 四个 bucket 仍存裸 id，与历史 localStorage 完全兼容。
  - **旧日记幂等迁移**：`migrateDiaryKeys()` 在首次 `refreshCounts()` 前跑一次，按**当年的查找顺序**（CHINA→CN_CITIES→WORLD_COUNTRIES→WORLD）判定裸 id 归属，因此 `es` 仍然归恩施——迁移不改变任何已显示的历史结果，只消除歧义。
- 测试：
  - `旅行地图_城市版.验收测试.mjs` **88 PASS / 0 FAIL**（新增 WA10–WA15 数据完整性、WB3b、WE7–WE13 国家搜索/分组/标记过滤）。
  - `旅行地图_地点日记.验收测试.mjs` **36 PASS / 0 FAIL**（新增 M1–M8 迁移与跨表串档守卫）。
  - **改前对照**：城市版 **69 PASS / 19 FAIL**、日记版 **11 FAIL**（S4/S6/D2/D7 + M1/M3/M4/M5/M6/M7/M8），证明新断言有分辨力而非空跑。
  - 四条关联冒烟测试全绿：批一 26 / 批二 26 / 批三 **27** / 首页与观剧 **57**。批三 `O8-1` 原写死占位符旧文案，改为「占位符含国家 + 国家模式确实显示搜索框」，文案会改、显隐条件才是实质。
- 升 `APP_CACHE` v24 → **v25**。

### 时间线（第八页，v26，commit `0474ba6`，2026-11-22）

用户需求：把各页面不同的事件按时间线串联起来。

- **只读聚合**：`时间线.html` 直读六源已有数据（任务 `doneAt` / 习惯 `days`+`dayTs` / 明信片 `sent·arrived·received` / 海报墙感想 `ts` / 观剧 `date` / 地图 `litAt` + IndexedDB 日记），**不写任何业务数据键**（唯写共用 `wb_theme_v1`）。各页已有各自的云同步/墓碑/合并，再存副本即第三套要仲裁的数据。
- **解析唯一源**：`_shared/timeline-core.js` 注入时间线与首页（首页第六卡显示本年事件数），共享内联块 21 → **25**。
- **地图补记点亮时刻**：`state.litAt = { 唯一键k: {t, n} }`。合成点亮不写、连带撤销要删、键必须带前缀（`gd` 既是广东也是格林纳达）。2026-11-22 之前的点亮无法追溯，页脚已注明。
- **不伪造时刻**：日级事件显示 `11-20` 而非 `11-20 00:00`，排序用显式比较器（先按日 → 同日精确在前 → 同精度按时刻）。
- **日记只读探测**：先 `indexedDB.databases()` 确认库存在再 open（裸 open 会在库不存在时建出空库，导致地图页 store 永久建不起来）。
- 共享层口径升级：注入器 / 门禁页面清单七页 → 八页，`sync_tokens.js` 纳入时间线页；首页第六张卡 `card full` 全宽，六卡 = 3×span2 + 2×span3 + 1×span12。
- 本轮门禁：发布门禁 0 失败、TOKENS 八页 IN_SYNC、镜像 27 项、全量回归 **68 PASS**、焦点 E2E **36 PASS**、P1-9 **42 PASS**（因导航新增一项触发 G10，已 `--old` 对照 → 备份旧基线 → 重冻）。时间线测试 75 PASS、地图 97 PASS（新增 WH1–WH9）。升 `APP_CACHE` v25 → **v26**。

### 海报墙时间戳 + 读书日级（v27，2026-11-22）

用户需求：给海报墙的「看过 / 想看」补时间戳，并问能否用之前那份豆瓣导出补。三份 CSV（`douban-book/movie/music-collect-20260714.csv`）实况决定了能做什么：

- **能补的**：书本 344/345 行「标记日期」形如 `2009/06/07 读过` → `date` 由 `YYYY-MM` 升级为 **`YYYY-MM-DD`**。同书多版本（5 组 6 行，含《红楼梦脂评汇校本》）取与原月份一致的那条，只补日不改月。「未知图书」导出也没日期，保持空。
- **不能补的**：电影 995 / 音乐 395 行的「标记日期」**全为空**。它们现有的 `date` 其实是**上映/发行日期**（与「发行/出版日期」月份一致：影 954 + 音 335）——所以弹窗不再统一写「完成于」，改按类型分 **读完于 / 发行于**，分析页两处提示补口径说明；这些条目**一律不进时间线**（宁可缺，不可假）。三份 CSV 里「想看」条目 0 条，心愿单历史时间无法回填。
- **从今天起记**：心愿单新增写 `wishAt`（毫秒），标记完成时**保留**（历史不是状态）；标记完成写日级 `date`（原来只到月，白丢精度）；弹窗显示「加入心愿单 2026-11-22 11:58」，达成后「· 心愿单里待了 N 天」，旧条目缺字段则如实写「时间未记录」。
- **时间线接入**：新增只读索引 `wb_mediawall_readlog_v1`（**海报墙单点写、时间线只读**，同 `stats` 既有做法；MEDIA 只内联在海报墙页，跨页读不到，file:// 又不能 fetch 本地 HTML）。索引只收「书本 + 合法日期」，影音零条；同题同日并掉 1 条 → **343 条**。`timeline-core` 增 `4b` 心愿单（精确到分）与 `4c` 读完了（受 `withDone` 控制）；事件模型加 `variant`（review/wish/done）与 `lvl`（min/day/month/year），时间戳文案严格跟随精度。时间线页新增「☑ 含历史「读完了」343 条」开关，**默认不勾**，没有索引时置灰并说明「打开一次海报墙页就会生成」。
- 本轮门禁：全量回归 **69 PASS**（新增专项 1 个）、时间线 **98 PASS**（新增 D1–D23）、海报墙专项 **37 PASS**（新建）、数据规范化 **23 PASS**（5.1 放宽 + 5.5/5.6/5.7 反向守卫）。分辨力对照：把缺失 `wishAt` 改成 `Date.now()` → D7/D9 立即 FAIL。真浏览器走完整表单验到 `wishAt` 落库、`date=2026-11-22`、`wishAt` 保留；390px 无溢出、暗色可读。升 `APP_CACHE` v26 → **v27**。执行报告 `deliverables/workbench-audit-1105/海报墙时间戳与读书日级_20261122.md`。

### 海报墙时间字段分家：date（我的完成）vs release（作品发行）（v28，2026-11-22）

v27 只改了文案，遗留一个问题：**同一个 `date` 字段被两种含义共用**。影音的 `date` 是上映/发行日期，书本的 `date` 是读完日期，于是这些统计全都在拿「2010 年上映了多少部电影」当「2010 年看完了多少作品」：

| 受影响处 | 旧行为 | v28 |
|---|---|---|
| 完成年份分布 | 书本 + 影音混算（1721 条） | 只算 `date`（344 条真实读完 + 自建条目） |
| 月度消费节奏 | 含影音发行月份 | 改名「月度完成节奏」，只算 `date` |
| 分组卡片「最近完成」 | 三个分组统一说「最近完成」，影音那一栏是发行年 | 有 `date` 说「最近完成」，只有 `release` 说「最近发行」 |
| 兴趣画像「近期权重」 | 影音按**上映年份**算近期热度 | 只认 `date`，影音不再被抬成「兴趣升温」 |
| 排序「最近完成」 | 混排 | 改名「最近完成 / 发行」，`date` → `release` → `year` 三级 |
| 详情弹窗 | 按 `type` 猜（非书本一律「发行于」），自建电影条目会被说成「发行于」 | 按**字段**判：内置影音「发行于」+ 书本「读完于」/ 自建「完成于」；发行月份已含年份时不再重复显示「年份」 |
| 分析页 | 影音 1377 条信息无处可看 | 新增「影音发行年代」图，写明「不是观看时间」 |

- **数据迁移**：内置影音 1377 条的 `date` → `release`（键名原地替换，其余字段逐字段校验一致）。迁移后 `date` 344 条**全部是书本**，`release` 1377 条**全部是影音**，9 条音乐 + 「未知图书」本来就没日期。
- **顺带修的**：新增/编辑表单「完成日期」输入框 `type="month"` → **`type="date"`**（既然标记完成已精确到日，输入框只到月是自相矛盾）。
- **未动**：影音依然没有观看时间（豆瓣导出「标记日期」整列为空），所以时间线里依然只有书本「读完了」；`wb_mediawall_readlog_v1` 索引、`timeline-core` 的 4b/4c 逻辑不变。
- 本轮门禁：全量回归 **69 PASS**、海报墙专项 **44 PASS**（+12，新增 A13/A14/A15 字段契约与 C5–C12 反向守卫）、数据规范化 **27 PASS**（+4，5.1 收紧为「date 必须是日级」、5.8/5.9/5.10 release 硬约束）。分辨力对照：把 `release` 改回 `date` 或给影音补 `date` → 4.4/5.6 立即 FAIL。真浏览器验到「书本 读完于 2009-06-07」「电影 发行于 2010-10 且不重复显示年份」「自建电影 完成于 2026-03-04」，390px 无横向溢出、暗色可读。升 `APP_CACHE` v27 → **v28**。

### 批一「止血」：4 个页面级真缺陷 + 门禁两条分辨力缺陷（v29，2026-11-22）

全站审查（`deliverables/workbench-audit-1105/全站审查_20261122.md`）查出 8 条 P0，本批修掉其中 6 条——**全部落在现有测试覆盖之外**：修前 `check.sh --full` 是全绿的（69 PASS + 36 PASS），说明这些不是「测试没跑」，而是「测试没测」。

| # | 缺陷 | 位置 | 旧行为 |
|---|---|---|---|
| 1 | 观剧删除带照片的记录抛 `ReferenceError` | `观剧记录.html` 删除回调 | 调用 `idbGet(id)`，但全页只定义了 `idbAll/idbPut/idbDel` → 确认删除后毫无反馈、记录仍在、照片未删 |
| 2 | 观剧照片 `src` 未转义 + 导入信任备份里的 `dataUrl` | `recHtml` / `renderThumbs` / 导入回调 | `<img src="'+thumbsCache[id]+'"` 直拼；导入把外部 JSON 的 `dataUrl` 原样当缩略图。`_dataUrlToBlob` 对非 dataURL 也返回非空 Blob（`atob('')` 不抛），于是伪造的 `x" onerror="…` 能被存库再拼进属性。file:// 页面同源 → 可读全部 localStorage（任务台/明信片/地图数据都在射程内） |
| 3 | 明信片「本地备份」面板永远打不开 | `data-dtab="local"` 面板 | 初始态写的是内联 `style="display:none;"`，而 `setPostcardDataTab` 只切 `hidden` 属性、内联样式永不被移除 → 内联 `display:none` 压过 `[hidden]` 规则，切过去整块空白，导出 / 导入按钮完全不可达 |
| 4 | 地图降级层脱离容器、铺满视口并吃掉全部点击 | `#mapWrap` | 降级层用 `position:absolute;inset:0` 插进 `#map`，但 `#mapWrap`/`#map` 都没有定位上下文 → 包含块退回视口，不透明背景 + `z-index:2` 压在导航条之上，直接推翻它自己写的「清单与日记仍可正常使用」 |
| 5 | 地图清空标记不清 `litAt` | 清空按钮 | 只清数组不清时刻表 → 时间线继续报「点亮了葡萄牙」而地图已全灭（`litAt` 是时间线点亮事件的唯一来源） |
| 6 | 发布门禁对重复内联块零分辨力 | `verify_release.py` / `inject_shared.py` | 把 SHARED 块复制两份 + `index.html` 同步 → 门禁 **0 项失败 25/25 PASS**；而文件里有 2 个 `const CFG_DAY_MS`/`PAGE_SIZE`，同一 `<script>` 重复顶层 const → 整页 SyntaxError 白屏。根因：注入器 `pat.sub(count=1)` 只换第一份、门禁只 `re.search` 首个块 |
| 7 | `--repo` 校验任何副本都是假绿 | `verify_release.py:src_path` | 源文件路径绑在 `HERE`（脚本自身目录），`--repo` 只换产物目录 → 用 tools-site 的脚本校验 `Projects/` 得 25/25 全过，而 Projects 自带脚本跑同一目录报 3 项 FAIL |

- **门禁改法**：源文件改从 `REPO/_shared` 取（副本缺 `_shared` 直接报错，不回退）；每页每块断言 `count(BEGIN)==count(END)==1`；导航断言 `good==7` → `len(nav_pages)`（8 页那句 PASS 此前永远打不出来）；`<body[^>]*>` → `<body\b[^>]*>`（避免命中块内注释）。注入器加写盘前预检 + 原子写（`os.replace`）+ 返回值区分「有变化 / 无变化」。
- **顺带补的**：`Projects/` 阅读副本此前**落后两版**（`sw.js` 停在 v26、`timeline-core.js` 是旧版），而 `--check-mirror` 只比 `tools-site ↔ pc-app` 从不覆盖它——谁误在 Projects 下跑一次 inject，旧块就整块覆盖回时间线页与首页。现已在 `run_regression.py --check-mirror` 里加第二组 27 项「阅读副本」校验；`sw.js` 的 `NAV_MAP` 也补上了此前漏掉的 `时间线.html`。
- **行为变化（刻意保守）**：地图城市视图清空时**仍然**连带清空省份桶（沿用旧行为），本批只修 `litAt` 一致性，不改级联语义。
- 本轮门禁：发布门禁 **0 失败**、镜像 **27+27 项**（含阅读副本）、全量回归 **70 PASS**（+1 本批专项）、焦点 E2E **36 PASS**、P1-9 **42 PASS**、时间线 **98 PASS**、海报墙 **44 PASS**、数据规范化 **27 PASS**。升 `APP_CACHE` v28 → **v29**。
- **分辨力对照**（新增 `_ops/_测试/站点_批一止血_20261122.冒烟测试.mjs`，30 条断言）：用 `git show HEAD:` 取改前字节放到临时目录、`WB_REPO` 指过去跑同一套 → **22 FAIL / 8 PASS**，证明断言不是空跑（余下 8 条是「未改变行为的守卫」，如切换函数仍用 `hidden`、降级层仍存在）。

### 批二「数据正确性」：重复规则 / 云合并仲裁 / 补打卡 / 代寄脏检查 / 逾期出口（v30，2026-11-22）

承接批一，处理审查报告里的 5 条 P1——**都属"数据算错但界面不报错"的静默型问题**，用户往往几周后才察觉。

| # | 缺陷 | 位置 | 旧行为 |
|---|---|---|---|
| 1 | 快速添加「每周三」丢掉星期 | `parseNL` / `recMatch` / `recLabel` | `parseNL` 产出 `{freq:"weekly", day:3}`，而 `recMatch`/`recLabel` 只认 `daysOfWeek` → 快速添加按**创建当天**重复；同一句话在新建弹窗点「识别」却写 `daysOfWeek`（正确）。两条录入路径结果不一致，且重复规则一次设定长期生效 |
| 2 | 云合并：云端任务命中本地墓碑就丢弃，**不比时间戳** | `mergeTasks` 云端分支 | 同函数本地分支按 `updated` vs 墓碑 `ts` 裁决，云端分支却是 `if(!t\|\|del.has(t.id)) return;` → A 删 T、B 随后编辑 T，则 A 永远看不到 T、B 永远删不掉 T，每次同步互相覆盖一次 |
| 3 | 补打卡「仅目标日」拿**本周**日期去和任意历史区间求交集 | `confirmHabitBackfill` + `habitWeekTargetDays` | 周一打开时默认区间（today-5~today-1）整段落在上一周 → 交集恒空 → 明明一天没打却提示「所选日期均已打卡」；跨周区间被静默丢弃 |
| 4 | 单向代寄的往返节点日期不在脏检查字段里 | `明信片追踪.html` `PROXY_FORM_IDS` | 缺 `pEnvSent`/`pEnvRecv`/`pProxyMode`，而 `saveProxyModal` 会写这三项 → 「只改一两个往返节点日期」这个最典型场景按 Esc 无提示丢数据 |
| 5 | 今日页逾期 14 天窗口外的积压没有出口 | `buildTodayModel` / `todaySectionsHtml` | 15 天前到期的任务从主入口静默消失，而顶部「逾期」功能卡走 `collectOverdueSet`（非重复不限窗口）→ 两个数字当场矛盾 |

- **重复规则改法**：`parseNL` 统一产出 `daysOfWeek`（保留 `rec.day` 兜底兼容）；`recLabel(rec, baseStart)` 新增起算日参数——老数据缺 `daysOfWeek` 时按**起算日的星期**显示（与 `recMatch` 的兜底同口径），此前回退成 `new Date().getDay()` 甚至渲染出「周0」。
- **云合并改法**：抽出 `aliveByTomb(t, dts)` 作为**唯一判据**，本地/云端两侧都调它：`ts>0` 时 `updated > ts` ⇒ 删除后又被编辑，任务复活并撤销墓碑；`ts==0` 的旧格式墓碑只删「从未编辑过」的任务。任务活着就 `del.delete(id)`，否则过时墓碑会被一路传下去反复误杀。
- **补打卡改法**：新增 `habitTargetDaysInRange(h, d0, d1)` 在**给定区间内**推导目标日（daily=每天 / weekly=每自然周前 N 天 / custom=勾选星期 / someday=空）；`habitWeekTargetDays` 原样保留给「本周目标日」「本周全完成」等真正按周的功能。
- **逾期出口**：窗口常量收敛为 `TODAY_BACKLOG_DAYS=14`，新增 `countOlderOverdue(d0, shownIds)`（任务级去重、排除窗口内已展示过的任务、重复任务沿用 90 天视野与 `collectOverdueSet` 同源）→ 今日页底部一行「还有 N 项更早逾期 · 去回顾查看」。**14 天窗口本身刻意保留**（历史积压全铺开会淹没今天）。
- ⚠️ **踩到的坑（已写成断言）**：切视图最初写成 `go(VIEWS.REVIEW)`——`go()` 是 `CmdPalette` IIFE 内的**私有函数**，非全局，点击时抛 `ReferenceError`，而静态断言与 `node --check` 都看不出来。现改为 `state.view=VIEWS.REVIEW; syncSeg&&syncSeg(); renderAll();`，并加**点击行为断言**（E12）守它。
- 本轮门禁：发布门禁 **0 失败**、镜像 **27+27 项**、全量回归 **71 PASS**（+1 本批专项）、焦点 E2E **36 PASS**、P1-9 **42 PASS**（已按流程重冻基线）、时间线 **98 PASS**、海报墙 **44 PASS**、数据规范化 **27 PASS**。升 `APP_CACHE` v29 → **v30**。
- **分辨力对照**（新增 `_ops/_测试/站点_批二数据正确性_20261122.冒烟测试.mjs`，37 条断言）：改前字节（`git show HEAD:`）→ **31 FAIL / 6 PASS**；再把 `bindOlderOverdue` 改回 `go(VIEWS.REVIEW)` → 只有 E5/E12 变红（证明这两条专治该回归）。
- 决策留痕：今日页逾期窗口**维持 14 天 + 提示行**（不放宽到 90 天）；云合并**按时间戳仲裁**（编辑晚于删除则保留）。

### 批三「体感与无障碍」：习惯格键盘化 / 筛选条不失焦 / 状态色 token / 口径对齐 / SW 加固（v31，2026-11-22）

- **任务台**：习惯打卡格 div → `<button>`（键盘此前完全打不开），`aria-pressed` + `aria-label`，暂停/归档用 `aria-disabled` 保留点击说明路径；`patchHabitCell` 局部补丁同步 aria；Escape 链补 6 个此前关不掉的弹窗（batchProps/habitBackfill/hbStyle/merge/tag/opt）；状态色全套换语义 token（cloudpill/detail-status/badge.gw/sec-fix/btn-danger）。
- **明信片**：`buildFilterBar` 按视图缓存 DOM（`dataset.builtView` 短路），任意保存动作不再销毁搜索框打断输入；`renderChipsGeneric` 内容不变跳过重建、重建后焦点还给同 key chip；badge-duesoon/btn-danger/toast 三态换 soft+ink token。
- **地图**：切层级/区域清搜索词（`clearSearchWord`，连带取消飞点定时器）；日记默认日期改本地拼接（`toISOString` 在东八区 0–8 点会写昨天）；toast 文字 `var(--bg)` 自动反转。
- **观剧**：保存幂等锁 `_savingRec`（防双击重复入库，finally 释放）；toast 反色；补 manifest / theme-color / viewport-fit。
- **时间线口径**：核心新增 `loadDiaryEvents()`（只读探测 IndexedDB，与地图页建库约定一致）+ `collect({extra})` 合并管线；首页摘要异步并入日记（此前首页不含日记，与时间线页「本年事件数」分叉）。时间线页自身 loader 不动。
- **SW/发布链**：预缓存 `cache:"reload"`（绕过 Pages max-age=600 预缓存旧 HTML）；静态资源 `no-cache` 条件重验；注册加 `updateViaCache:"none"`；观剧/地图补 PWA 元信息；`verify_release` 新增 **PRECACHE 反向断言**（站点资源未进预缓存即报红）。
- 文字安全色 `--ok-ink / --warn-soft / --warn-ink / --danger-soft / --danger-ink` 已进 design_tokens.css 与 8 页 SHARED TOKENS（sync_tokens 同步）。
- 本轮门禁：发布门禁 **0 失败**（含新反向断言）、镜像 **27+27 项**、全量回归 **72 PASS**（+1 本批专项 49 断言）、焦点 E2E **36 PASS**、P1-9 **42 PASS**（基线已重冻，备份 `_P1-9基线_改前_v30批三.json`）。分辨力对照：改前字节 **46 FAIL / 3 PASS**。升 `APP_CACHE` v30 → **v31**。

## 本机副本

- `~/.workbuddy/publish/tools-site` = 本仓库（唯一发布源码）。
- `~/.workbuddy/publish/pc-app` = 回归测试镜像，25 套脚本硬编码读它，必须与本仓库同版。
- vault `Projects/` = Obsidian 内的本地阅读副本。**自 2026-11-22 起纳入 `--check-mirror` 的「阅读副本」27 项校验**（此前只比 pc-app，它悄悄落后了两版：`sw.js` 停在 v26、`timeline-core.js` 是旧版；而副本自带 `verify_release.py`，误跑一次 inject 就会把旧块覆盖回两页）。它也有自己的 `_shared/`，所以 `verify_release.py --repo <Projects>` 现在会用副本自己的源比对产物，能真实报红。
  双击打开是 `file://`，localStorage 与线上不同源、数据不互通，日常使用请走线上 URL。
