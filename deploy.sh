#!/bin/bash
# Mail Hub 一键部署脚本

set -e

echo "=========================================="
echo "  Mail Hub 部署脚本"
echo "=========================================="

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "错误: 未安装 Docker"
    echo "请先安装 Docker: https://docs.docker.com/engine/install/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "错误: 未安装 docker-compose"
    exit 1
fi

# 生成加密密钥
echo "生成加密密钥..."
ENCRYPTION_KEY=$(openssl rand -hex 32)
echo "密钥已生成: ${ENCRYPTION_KEY:0:16}..."

# 创建 .env 文件
cat > .env << EOF
# Mail Hub 配置
PORT=3000
ENCRYPTION_KEY=${ENCRYPTION_KEY}
SYNC_INTERVAL=*/5 * * * *
EOF

echo "配置文件已创建"

# 构建并启动
echo "构建 Docker 镜像..."
docker-compose build

echo "启动服务..."
docker-compose up -d

echo ""
echo "=========================================="
echo "  部署完成!"
echo "=========================================="
echo ""
echo "访问地址: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "加密密钥已保存到 .env 文件"
echo "请妥善保管此密钥，它用于加密邮箱密码"
echo ""
echo "下一步:"
echo "1. 打开浏览器访问上述地址"
echo "2. 点击'账号管理'添加邮箱"
echo "3. 配置邮箱的 IMAP 授权码"
echo ""
echo "常用命令:"
echo "  查看日志: docker-compose logs -f"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo ""
