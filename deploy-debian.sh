#!/bin/bash

# Debian 系统部署脚本
# 用于在 Debian 系统上部署进程保活管理器

set -e

echo "🚀 开始部署进程保活管理器到 Debian 系统..."

# 检查是否为 root 用户
if [[ $EUID -ne 0 ]]; then
   echo "⚠️  请使用 root 用户运行此脚本"
   echo "   sudo ./deploy-debian.sh"
   exit 1
fi

# 更新系统包
echo "📦 更新系统包..."
apt update && apt upgrade -y

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
mkdir -p /var/log/ma'na'ge'r

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
echo ""

# 询问是否立即启动服务
read -p "是否立即启动服务？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    systemctl start manager
    echo "✅ 服务已启动"
    systemctl status manager
fi