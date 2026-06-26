FROM node:20-alpine AS client-build

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY server/package*.json ./server/
RUN cd server && npm ci --production

# 复制服务端代码
COPY server/ ./server/

# 复制前端构建产物
COPY --from=client-build /app/client/dist ./client/dist

# 创建数据目录
RUN mkdir -p /app/data

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/mail-hub.db

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server/index.js"]
