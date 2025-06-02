#!/bin/bash

# Debian 系统部署脚本
# 用于在 Debian 系统上部署进程保活管理器 (支持多服务器功能)

set -e

echo "🚀 开始部署进程保活管理器到 Debian 系统..."
echo "📋 本版本支持多服务器管理功能"

# 检查是否为 root 用户
if [[ $EUID -ne 0 ]]; then
   echo "⚠️  请使用 root 用户运行此脚本"
   echo "   sudo ./deploy-debian.sh"
   exit 1
fi

# 更新系统包
echo "📦 更新系统包..."
apt update && apt upgrade -y

# 安装系统依赖 (多服务器功能需要)
echo "📦 安装系统依赖..."
apt-get install -y curl wget gnupg2 software-properties-common build-essential python3 make g++

# 安装 SSH 客户端 (如果未安装)
echo "📦 确保 SSH 客户端已安装..."
apt-get install -y openssh-client

# 安装 Node.js 18
echo "📦 安装 Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 验证安装
echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"

# 安装 PM2 (可选，用于生产环境管理)
echo "📦 安装 PM2..."
npm install -g pm2

# 安装项目依赖
echo "📦 安装项目依赖..."
npm install

# 验证多服务器功能依赖
echo "🔍 验证多服务器功能依赖..."
if npm list ssh2 &> /dev/null; then
    echo "✅ SSH2 依赖已安装"
else
    echo "⚠️  SSH2 依赖未找到，正在安装..."
    npm install ssh2 @types/ssh2
fi

# 构建项目
echo "🔨 构建项目..."
npm run build

# 创建 systemd 服务文件
echo "⚙️  创建 systemd 服务..."
cat > /etc/systemd/system/manager.service << 'EOF'
[Unit]
Description=Process Keeper - 进程保活管理器
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/manager
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=manager

[Install]
WantedBy=multi-user.target
EOF

# 重新加载 systemd
systemctl daemon-reload

# 启用服务
systemctl enable manager

# 创建防火墙规则（如果使用 ufw）
if command -v ufw &> /dev/null; then
    echo "🔥 配置防火墙..."
    ufw allow 3000/tcp
fi

# 创建日志目录
mkdir -p /var/log/manager

# 创建数据目录和配置文件
echo "📁 创建数据目录..."
mkdir -p /root/manager/data
touch /root/manager/servers.json
touch /root/manager/processes.json
touch /root/manager/multi-server-processes.json

# 设置文件权限
chmod 600 /root/manager/servers.json
chmod 600 /root/manager/processes.json
chmod 600 /root/manager/multi-server-processes.json

echo "✅ 部署完成！"
echo ""
echo "🔧 管理命令："
echo "   启动服务: systemctl start manager"
echo "   停止服务: systemctl stop manager"
echo "   查看状态: systemctl status manager"
echo "   查看日志: journalctl -u manager -f"
echo ""
echo "🌐 访问地址: http://your-server-ip:3000"
echo ""
echo "📝 注意事项："
echo "   1. 确保服务器的 3000 端口已开放"
echo "   2. 建议配置 nginx 反向代理"
echo "   3. 考虑配置 SSL 证书"
echo "   4. 多服务器功能需要目标服务器开启SSH访问"
echo "   5. 建议为SSH连接使用密钥认证而非密码"
echo ""
echo "🔐 多服务器功能说明："
echo "   - 支持通过SSH管理远程Linux服务器"
echo "   - 可在Web界面中添加和管理多个服务器"
echo "   - 支持跨服务器的进程创建和管理"
echo "   - 实时监控所有服务器的连接状态"
echo ""

# 询问是否立即启动服务
read -p "是否立即启动服务？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    systemctl start manager
    echo "✅ 服务已启动"
    systemctl status manager
fi