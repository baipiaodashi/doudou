#!/bin/bash
set -e

echo "========================================================"
echo "       拼豆图纸工坊 (PixelBeads Studio) Docker 启动脚本"
echo "========================================================"
echo ""

if ! docker info > /dev/null 2>&1; then
    echo "[错误] 未检测到正在运行的 Docker 引擎！"
    echo "请先启动 Docker 服务后再运行本脚本。"
    exit 1
fi

echo "正在通过 Docker Compose 构建并启动容器..."
docker compose up -d --build

echo ""
echo "========================================================"
echo " 部署成功！"
echo " 请在浏览器中访问: http://localhost:8080"
echo "========================================================"
