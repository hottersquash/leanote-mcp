#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${APP_DIR}"

echo "==> Deploying leanote-mcp (npm) in ${APP_DIR}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js >= 18 is required."
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "${NODE_MAJOR}" -lt 18 ]; then
  echo "Node.js >= 18 is required (found $(node -v))."
  exit 1
fi

if [ ! -f .env ]; then
  cp env.example .env
  echo "Created .env — set LEANOTE_BASE_URL and run again."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [ -z "${LEANOTE_BASE_URL:-}" ]; then
  echo "LEANOTE_BASE_URL is required in .env"
  exit 1
fi

if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi
npm run build

SERVICE_FILE="/etc/systemd/system/leanote-mcp.service"
if [ -f "${SERVICE_FILE}" ]; then
  echo "==> Restarting systemd service leanote-mcp"
  sudo systemctl restart leanote-mcp
  sudo systemctl status leanote-mcp --no-pager
elif [ -f leanote-mcp.service.example ]; then
  echo "==> Installing systemd service"
  sed "s|/opt/leanote-mcp|${APP_DIR}|g" leanote-mcp.service.example | sudo tee "${SERVICE_FILE}" >/dev/null
  sudo systemctl daemon-reload
  sudo systemctl enable --now leanote-mcp
  sudo systemctl status leanote-mcp --no-pager
else
  echo "==> Build complete. Start manually:"
  echo "    set -a && source .env && set +a && npm start"
fi

HOST_IP="$(hostname -I | awk '{print $1}')"
echo "==> Deployment complete"
echo "    Health: http://${HOST_IP}:${MCP_PORT:-3100}/health"
echo "    MCP:    http://${HOST_IP}:${MCP_PORT:-3100}/mcp"
