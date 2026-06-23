#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-docker}"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"

case "${MODE}" in
  docker)
    exec "${APP_DIR}/deploy-docker.sh" "${@:2}"
    ;;
  npm)
    exec "${APP_DIR}/deploy-npm.sh" "${@:2}"
    ;;
  *)
    echo "Usage: $0 {docker|npm}" >&2
    exit 1
    ;;
esac
