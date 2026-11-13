#!/bin/bash
# 工作台站点 · 发布前一键校验（只读，不改任何文件）
#   ./check.sh          快速门禁
#   ./check.sh --full   追加全量回归
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
VAULT="${VAULT_DIR:-/Users/chenhuiying/Documents/Obsidian Vault}"
NODE="${NODE_BIN:-/Users/chenhuiying/.workbuddy/binaries/node/versions/22.22.2-6/bin/node}"

echo "== 1/3 发布门禁 =="
python3 "$REPO/_shared/verify_release.py" --repo "$REPO" | tail -9

echo
echo "== 2/3 SHARED TOKENS 一致性 =="
"$NODE" "$VAULT/_ops/_workbench/sync_tokens.js" --check --repo "$REPO"

echo
echo "== 3/3 回归测试镜像一致性 =="
python3 "$VAULT/_ops/_workbench/run_regression.py" --check-mirror

if [ "${1:-}" = "--full" ]; then
  echo
  echo "== 4/4 全量回归（48 用例）=="
  python3 "$VAULT/_ops/_workbench/run_regression.py"
fi

echo
echo "全部检查通过。"
