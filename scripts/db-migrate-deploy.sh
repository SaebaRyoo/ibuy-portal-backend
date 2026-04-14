#!/bin/sh
# scripts/db-migrate-deploy.sh
# 线上安全迁移脚本 — 集成备份 + 状态检查 + 迁移执行
#
# 用法:
#   ./scripts/db-migrate-deploy.sh             # 完整流程（备份 + 迁移）
#   ./scripts/db-migrate-deploy.sh --no-backup # 跳过备份
#   ./scripts/db-migrate-deploy.sh --dry-run   # 只检查状态，不执行
#
# 此脚本适用于：
#   - CI/CD pipeline 中的迁移步骤
#   - 手动在服务器上执行迁移
#   - Docker 一次性容器执行迁移

set -euo pipefail

# ── 颜色输出 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── 参数解析 ──
SKIP_BACKUP=false
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --no-backup)
      SKIP_BACKUP=true
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
    *)
      echo "${RED}[ERROR]${NC} 未知参数: $arg"
      echo "用法: $0 [--no-backup] [--dry-run]"
      exit 1
      ;;
  esac
done

echo "${BLUE}================================================${NC}"
echo "${BLUE}       iBuy 数据库迁移工具 (Production)          ${NC}"
echo "${BLUE}================================================${NC}"
echo ""

# ── Step 1: 检查迁移状态 ──
echo "${YELLOW}[Step 1/4]${NC} 检查迁移状态..."
echo "-------------------------------------------"

npx prisma migrate status 2>&1 || true

echo ""

# ── 如果是 dry-run 模式，到此结束 ──
if [ "$DRY_RUN" = true ]; then
  echo "${GREEN}[DRY-RUN]${NC} 仅检查模式，不执行迁移。"
  exit 0
fi

# ── Step 2: 备份数据库 ──
if [ "$SKIP_BACKUP" = false ]; then
  echo "${YELLOW}[Step 2/4]${NC} 备份数据库..."
  echo "-------------------------------------------"

  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  if [ -f "$SCRIPT_DIR/db-backup.sh" ]; then
    sh "$SCRIPT_DIR/db-backup.sh"
  else
    echo "${YELLOW}[WARN]${NC} 找不到 db-backup.sh，跳过备份"
    echo "${YELLOW}[WARN]${NC} 强烈建议在迁移前手动备份！"
  fi
  echo ""
else
  echo "${YELLOW}[Step 2/4]${NC} 跳过备份 (--no-backup)"
  echo ""
fi

# ── Step 3: 执行迁移 ──
echo "${YELLOW}[Step 3/4]${NC} 执行数据库迁移..."
echo "-------------------------------------------"

if npx prisma migrate deploy; then
  echo ""
  echo "${GREEN}[SUCCESS]${NC} ✅ 迁移执行成功！"
else
  MIGRATE_EXIT_CODE=$?
  echo ""
  echo "${RED}[FAILED]${NC} ❌ 迁移执行失败！(exit code: $MIGRATE_EXIT_CODE)"
  echo "${RED}[FAILED]${NC} 请检查错误信息，必要时从备份恢复。"
  echo ""
  echo "恢复命令参考："
  echo "  gunzip -c backups/<backup_file>.sql.gz | psql -h \$POSTGRES_HOST -U \$POSTGRES_USER -d \$POSTGRES_DATABASE"
  exit $MIGRATE_EXIT_CODE
fi

echo ""

# ── Step 4: 验证迁移结果 ──
echo "${YELLOW}[Step 4/4]${NC} 验证迁移结果..."
echo "-------------------------------------------"

npx prisma migrate status

echo ""
echo "${GREEN}================================================${NC}"
echo "${GREEN}  迁移完成！现在可以安全部署新版本应用了。      ${NC}"
echo "${GREEN}================================================${NC}"
