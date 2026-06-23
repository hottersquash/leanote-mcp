#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${APP_DIR}"

echo "==> Deploying leanote-mcp in ${APP_DIR}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker first."
  exit 1
fi

if [ ! -f config/leanote.json ]; then
  cp config/leanote.example.json config/leanote.json
  echo "Created config/leanote.json — set Leanote baseUrl before starting."
fi

docker compose down 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

echo "==> Deployment complete"
echo "    Health: http://$(hostname -I | awk '{print $1}'):3100/health"
echo "    MCP:    http://$(hostname -I | awk '{print $1}'):3100/mcp"
docker compose ps
