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

# 使用 yarn 进行构建
RUN yarn build

# 暴露应用的端口
EXPOSE 8000

# 设置启动命令
CMD ["node", "dist/main.js"]
