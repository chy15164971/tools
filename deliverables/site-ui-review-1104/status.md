# 状态台账

| 阶段 | 角色 | 输入版本 | 状态 |
|---|---|---|---|
| 需求与验收 | team-lead（主理人） | commit 87d8ba6 工作副本 + 1440px 实测量测 | 已完成：brief.md / acceptance.md / 本文件 |
| 界面设计与视觉审查 | web-delivery-ui-designer | brief.md + 四页源码 + 四张截图 | 已完成：`design/spec.md`（494 行，归因量化 7%/40%/22%，建议保留 1240px；主理人基于「对齐」诉求取舍为统一 1360） |
| 独立审查与验收设计 | web-delivery-qa-reviewer | brief.md + 四页源码 | 已完成：`qa/findings.md`（15 项问题）+ `qa/test-plan.md`（11 项计划）+ 证据；改后复核进行中 |
| 实现 | web-delivery-developer | 主理人冻结的设计数值 + acceptance.md + QA 关注点 | 已完成主体；剩余 13 处由主理人接手补齐（如实标注） |
| 独立复核 | web-delivery-qa-reviewer | 改后稳定快照（MD5 见派发消息） | **已完成**：`qa/recheck.md`（349 行）+ 24 个证据文件（含 4 张截图）；无 P0/P1 残留，新增 1 项 P2 边缘对比度 |
| 收敛与交付 | team-lead | 全部证据 | **已完成**：复核结论并入用户报告 7.2–7.5；P2-R1 用 `--ov-sub` 修复并复验；commit `952db20` 已 push，线上 5/5 MD5 MATCH + https 冒烟通过 |

## 文件所有权
- 主理人：brief.md / acceptance.md / status.md / delivery.md
- 设计：`design/spec.md`（不写应用源码）
- 开发：`development/change-log.md`、`development/checks.md`，以及唯一可写的源码：`/tmp/toolsrepo2/home.html`、`/tmp/toolsrepo2/书影音海报墙.html`（仅限容器/视觉 CSS）、`_shared/site-nav.js`、`_shared/inject_shared.py`；由主理人同步到 vault 与重建 index.html
- 测试：`qa/test-plan.md`、`qa/findings.md`、`qa/evidence/`（默认只读应用源码）

## 交接记录
- 2026-11-04 19:2x 主理人完成四页 1440×900 真实布局量测与截图，发现：门户页无导航条 / 960px 容器 / 16px 字号；海报墙 1240px 容器与 8 列密集栅格；圆角与 token 体系三套口径。
