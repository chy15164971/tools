# 工作台站点（tools）

单文件零依赖 HTML 工作台：门户 `home.html` + 三个子应用（任务管理台 / 明信片追踪 / 书影音海报墙）。
本地优先 localStorage，GitHub Gist 为可选云同步，无账号体系、无后端。

线上：https://chy15164971.github.io/tools/home.html
仓库：`chy15164971/tools`，主分支 `main`。本仓库即发布仓库，push 后 GitHub Pages 自动构建。

## 发布契约（改动前必读）

1. **`index.html` 必须逐字节等于 `任务管理台.html`**。改完任务台后执行
   `cp 任务管理台.html index.html`，否则用户从根路径进入的是旧版。
2. 五页的共享代码由 `_shared/inject_shared.py` 注入三块：`SHARED`（任务台/明信片/index）、
   `SITE-NAV-HTML`（五页）、`SITE-NAV`（五页）。**不要在页面里直接编辑标记区内的内容**，
   改源文件 `_shared/shared.js` / `site-nav-static.html` / `site-nav.js` 后重新注入。
   导航条必须是 `<body>` 开头的静态 HTML，不能退回 JS 延迟插入（会重现首屏闪旧画面）。
3. 共享色板唯一真相源是 vault `_ops/_workbench/design_tokens.css`；
   私有变量写在 `SHARED TOKENS START/END` 标记区**之外**，否则下次同步会被整块覆盖。
4. **改任何 HTML 字节都要升 `APP_CACHE` 版本号**（当前 v7）：SW 字节不变就不触发 install，
   已安装 PWA 会继续从旧预缓存读页面（2026-11-13 v6、11-15 v7 均按此处理）。
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
| 发布门禁 | `python3 _shared/verify_release.py` | 6 项：index 契约、13 个内联块、导航块位置、tokens、PRECACHE、品牌链接 |
| 色板同步 | `node "$VAULT/_ops/_workbench/sync_tokens.js" --check --repo .` | 五页 SHARED TOKENS 与 design_tokens.css 一致 |
| 全量回归 | `python3 "$VAULT/_ops/_workbench/run_regression.py"` | 49 个用例；0 未解释失败才算通过 |
| 镜像校验 | `... run_regression.py --check-mirror` | 显式清单 23 项逐字节一致（含 `sw.js`、`index.html`、`home.html`、海报墙、`icons/` 全部图标） |
| 焦点 E2E | `python3 "$VAULT/_ops/_workbench/focus_trap_e2e.py"` | 真实 Chrome Tab / Shift+Tab 回环 29 条断言；任务台 / 明信片 / 海报墙三页，含动态确认框与背景锁滚 |

`VAULT` 默认为 `/Users/chenhuiying/Documents/Obsidian Vault`，可用环境变量 `VAULT_DIR` 覆盖。

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

改源码 → 同步 `index.html` → 同步 `pc-app` / vault `Projects/` 镜像 → 重新注入共享块 → `./check.sh --full` → commit & push →
等 Pages 构建（`sw.js?cb=<时间戳>` 轮询版本号，注意 10 分钟磁盘缓存）→ 线上 18 个文件 MD5 比对 →
真浏览器 E2（亮/暗、390×844）。

## 本机副本

- `~/.workbuddy/publish/tools-site` = 本仓库（唯一发布源码）。
- `~/.workbuddy/publish/pc-app` = 回归测试镜像，25 套脚本硬编码读它，必须与本仓库同版。
- vault `Projects/` = Obsidian 内的本地阅读副本（2026-11-13 已同步为 7e85231）。
  双击打开是 `file://`，localStorage 与线上不同源、数据不互通，日常使用请走线上 URL。
