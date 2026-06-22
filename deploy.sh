#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/leanote-mcp"
SERVICE_NAME="leanote-mcp"

echo "==> Deploying leanote-mcp to ${APP_DIR}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker first."
  exit 1
fi

sudo mkdir -p "${APP_DIR}"
sudo cp -r . "${APP_DIR}/"
cd "${APP_DIR}"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created ${APP_DIR}/.env — please edit Leanote credentials before starting."
fi

docker compose down 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

echo "==> Deployment complete"
echo "    Health: http://$(hostname -I | awk '{print $1}'):3100/health"
echo "    MCP:    http://$(hostname -I | awk '{print $1}'):3100/mcp"
docker compose ps
