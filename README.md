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
4. **改任何 HTML 字节都要升 `APP_CACHE` 版本号**（当前 v12）：SW 字节不变就不触发 install，
   已安装 PWA 会继续从旧预缓存读页面（2026-11-13 v6、11-15 v7、11-16 v8→v9→v10→v11→v12 均按此处理）。
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
| 全量回归 | `python3 "$VAULT/_ops/_workbench/run_regression.py"` | 54 个用例；0 未解释失败才算通过 |
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

## 发布流程

改源码（含 `_shared/modal-a11y.js`）→ 重新注入四块 → 同步 `index.html` → 同步 `pc-app` / vault `Projects/` 镜像 → `./check.sh --full` → commit & push →
等 Pages 构建（`sw.js?cb=<时间戳>` 轮询版本号，注意 10 分钟磁盘缓存）→ 线上 18 个文件 MD5 比对 →
真浏览器 E2（亮/暗、390×844）。

## 本机副本

- `~/.workbuddy/publish/tools-site` = 本仓库（唯一发布源码）。
- `~/.workbuddy/publish/pc-app` = 回归测试镜像，25 套脚本硬编码读它，必须与本仓库同版。
- vault `Projects/` = Obsidian 内的本地阅读副本（2026-11-13 已同步为 7e85231）。
  双击打开是 `file://`，localStorage 与线上不同源、数据不互通，日常使用请走线上 URL。
