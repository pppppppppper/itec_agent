#!/usr/bin/env bash
#
# 智图伙伴 · 一键部署
# ====================
# 本地构建 → 打包上传 → 重启服务。
#
# 用法：
#   ./scripts/deploy.sh                    # 用默认主机和密钥
#   ZHITU_HOST=root@1.2.3.4 ./scripts/deploy.sh
#   ZHITU_KEY=~/.ssh/id_ed25519 ./scripts/deploy.sh
#
# 服务器上只放两样东西：dist/（静态产物）和 server/index.mjs（静态 + 代理）。
# 所以这个脚本不需要在服务器上装 Node 依赖，也不需要 rsync。
set -euo pipefail

HOST="${ZHITU_HOST:-root@8.152.1.26}"
KEY="${ZHITU_KEY:-$HOME/.ssh/id_ed25519}"
REMOTE_DIR="${ZHITU_DIR:-/opt/zhitu}"
PORT="${ZHITU_PORT:-8080}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SSH_OPTS=(-i "$KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20)

echo "▸ 1/4 契约自检"
npm run --silent check:contract

echo "▸ 2/4 构建"
npm run --silent build

echo "▸ 3/4 上传到 $HOST:$REMOTE_DIR"
tar -czf - -C "$ROOT" dist server | ssh "${SSH_OPTS[@]}" "$HOST" \
  "rm -rf '$REMOTE_DIR/dist' '$REMOTE_DIR/server' && mkdir -p '$REMOTE_DIR' && tar -xzf - -C '$REMOTE_DIR'"

echo "▸ 4/4 重启服务"
ssh "${SSH_OPTS[@]}" "$HOST" "systemctl restart zhitu && sleep 2 && systemctl is-active zhitu"

echo
echo "✓ 部署完成"
echo "  健康检查： ssh ${SSH_OPTS[*]} $HOST 'curl -s -o /dev/null -w \"%{http_code}\" http://127.0.0.1:$PORT/'"
echo "  实时日志： ssh ${SSH_OPTS[*]} $HOST 'tail -f /var/log/zhitu.log'"
