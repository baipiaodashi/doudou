FROM node:20-slim

WORKDIR /app

# 安装中文字体与西文字体库及配置，确保 Canvas 图纸导出文字渲染正常
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-wqy-microhei \
    fonts-dejavu-core \
    fontconfig \
 && fc-cache -fv \
 && rm -rf /var/lib/apt/lists/*

# 安装纯生产依赖，不引入开发构建工具，极大降低弱性能 VPS 内存开销
COPY package*.json ./
RUN npm install --omit=dev --prefer-offline --no-audit

# 拷贝预编译后的运行产物
COPY dist ./dist

ENV PORT=3001
ENV NODE_ENV=production
# 弱性能 VPS 核心保护：单任务并发排队机制，防止 CPU 打满
ENV MAX_CONCURRENT_TASKS=1

EXPOSE 3001

CMD ["node", "dist/index.js"]
