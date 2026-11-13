#!/bin/bash
# 工作台站点 · 发布前一键校验（不改任何应用源码）
#   ./check.sh          快速门禁（1–3）
#   ./check.sh --full   追加全量回归 + 焦点陷阱真浏览器 E2E（4–5）
# 依赖：agent-browser CLI（第 5 步），本机发布仓库与 vault 工具链。
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
VAULT="${VAULT_DIR:-/Users/chenhuiying/Documents/Obsidian Vault}"
NODE="${NODE_BIN:-/Users/chenhuiying/.workbuddy/binaries/node/versions/22.22.2-6/bin/node}"

echo "== 1/5 发布门禁 =="
python3 "$REPO/_shared/verify_release.py" --repo "$REPO" | tail -9

echo
echo "== 2/5 SHARED TOKENS 一致性 =="
"$NODE" "$VAULT/_ops/_workbench/sync_tokens.js" --check --repo "$REPO"

echo
echo "== 3/5 回归测试镜像一致性 =="
python3 "$VAULT/_ops/_workbench/run_regression.py" --check-mirror

if [ "${1:-}" = "--full" ]; then
  echo
  echo "== 4/5 全量回归（含 SKIP 显式披露）=="
  python3 "$VAULT/_ops/_workbench/run_regression.py"

  echo
  echo "== 5/5 焦点陷阱真浏览器 E2E（覆盖 jsdom 显式 SKIP 的运行时断言）=="
  python3 "$VAULT/_ops/_workbench/focus_trap_e2e.py"
else
  echo
  echo "（4/5 全量回归、5/5 真浏览器 E2E 需 ./check.sh --full）"
fi

echo
echo "全部检查通过。"
