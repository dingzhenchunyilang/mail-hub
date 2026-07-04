#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

log() {
  printf '[mail-hub-update] %s\n' "$*"
}

require_clean_git() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    log '存在未提交改动，拒绝自动更新。请先提交或 stash。'
    exit 1
  fi
}

start_service() {
  cd "$ROOT_DIR/server"
  /home/hermes/.local/bin/node index.js >/tmp/mailhub_server.log 2>&1 &
  local new_pid=$!
  sleep 3
  if ! curl -fsS http://127.0.0.1:3000/api/health >/dev/null; then
    log '健康检查失败，查看日志：/tmp/mailhub_server.log'
    exit 1
  fi
  log "服务已启动，PID: $new_pid"
}

log '开始更新 Mail Hub...'
require_clean_git

if [[ "${1-}" == "--skip-pull" ]]; then
  log '跳过 git pull，仅执行 build + 重启 + 健康检查。'
else
  log '拉取远端最新代码...'
  git pull --ff-only
fi

log '重建前端静态产物...'
npm run build:client

log '请手动执行以下命令完成重启：'
log "pkill -f '/home/hermes/.local/bin/node index.js'"
log "cd $ROOT_DIR && bash update.sh --restart-only"

if [[ "${1-}" == "--restart-only" ]]; then
  log '执行服务启动...'
  start_service
  exit 0
fi

log '本轮已完成 pull + build。由于当前环境禁止自动杀进程，重启步骤需手动执行。'
