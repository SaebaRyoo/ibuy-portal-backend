# 使用官方 Node.js 运行时作为基础镜像
FROM node:20.18.0-alpine AS builder

# 设置工作目录为 /app
WORKDIR /app

# 复制 package.json 和 yarn.lock 文件
COPY package*.json yarn.lock ./

# 安装依赖（使用 yarn 代替 npm）
RUN yarn install

# 复制项目的其他文件
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 使用 yarn 进行构建
RUN yarn build

# 暴露应用的端口
EXPOSE 8000

# ⚠️ 不再在启动时自动执行 migrate
# 迁移应通过以下方式单独执行：
#   1. docker compose run --rm migrate（推荐）
#   2. pnpm db:deploy（本地/CI 环境）
#
# 旧方式（不推荐）：CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
CMD ["node", "dist/main.js"]
