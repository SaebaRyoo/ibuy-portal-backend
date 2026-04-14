#!/bin/sh
# scripts/db-backup.sh
# 线上数据库备份脚本 — 在执行迁移前调用
#
# 用法:
#   ./scripts/db-backup.sh                    # 使用环境变量
#   POSTGRES_HOST=xxx ./scripts/db-backup.sh  # 手动指定
#
# 环境变量 (从 .env 或环境中读取):
#   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DATABASE

set -euo pipefail

# ── 颜色输出 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ── 加载 .env（如果存在） ──
ENV_FILE="${ENV_FILE:-.env}"
if [ -f "$ENV_FILE" ]; then
  echo "${YELLOW}[INFO]${NC} 从 $ENV_FILE 加载环境变量..."
  set -a
  . "$ENV_FILE"
  set +a
fi

# ── 必要参数检查 ──
: "${POSTGRES_HOST:?需要设置 POSTGRES_HOST}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_USER:?需要设置 POSTGRES_USER}"
: "${POSTGRES_PASSWORD:?需要设置 POSTGRES_PASSWORD}"
: "${POSTGRES_DATABASE:?需要设置 POSTGRES_DATABASE}"

# ── 备份目录 ──
BACKUP_DIR="${BACKUP_DIR:-backups}"
mkdir -p "$BACKUP_DIR"

# ── 生成带时间戳的文件名 ──
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${POSTGRES_DATABASE}_${TIMESTAMP}.sql.gz"

echo "${GREEN}[BACKUP]${NC} 开始备份..."
echo "  数据库: ${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DATABASE}"
echo "  目标:   ${BACKUP_FILE}"

# ── 执行备份 ──
export PGPASSWORD="$POSTGRES_PASSWORD"

pg_dump \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DATABASE" \
  --no-owner \
  --no-privileges \
  --format=plain \
  | gzip > "$BACKUP_FILE"

unset PGPASSWORD

# ── 验证备份文件 ──
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
if [ -s "$BACKUP_FILE" ]; then
  echo "${GREEN}[BACKUP]${NC} ✅ 备份完成！"
  echo "  文件: ${BACKUP_FILE}"
  echo "  大小: ${BACKUP_SIZE}"
else
  echo "${RED}[BACKUP]${NC} ❌ 备份文件为空，可能备份失败！"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# ── 清理旧备份（保留最近 10 个） ──
KEEP_COUNT="${BACKUP_KEEP_COUNT:-10}"
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt "$KEEP_COUNT" ]; then
  DELETE_COUNT=$((BACKUP_COUNT - KEEP_COUNT))
  echo "${YELLOW}[CLEANUP]${NC} 清理旧备份（保留最近 ${KEEP_COUNT} 个，删除 ${DELETE_COUNT} 个）..."
  ls -1t "$BACKUP_DIR"/*.sql.gz | tail -n "$DELETE_COUNT" | xargs rm -f
fi

echo "${GREEN}[DONE]${NC} 备份流程完成"
