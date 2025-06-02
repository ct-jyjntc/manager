#!/bin/bash

# 快速卸载脚本 - 进程保活管理器
# 用于快速移除应用程序（保留系统组件如Node.js）

set -e

echo "🚀 快速卸载进程保活管理器..."

# 检查权限
if [[ $EUID -ne 0 ]]; then
   echo "⚠️  请使用 root 用户运行此脚本"
   echo "   sudo ./quick-uninstall.sh"
   exit 1
fi

# 确认操作
read -p "确定要快速卸载进程保活管理器吗？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 卸载已取消"
    exit 0
fi

echo "🛑 停止服务..."
# 停止 systemd 服务
systemctl stop manager 2>/dev/null || true
systemctl disable manager 2>/dev/null || true

# 停止 PM2 进程
if command -v pm2 &> /dev/null; then
    pm2 stop process-keeper 2>/dev/null || true
    pm2 delete process-keeper 2>/dev/null || true
fi

echo "🗑️  删除文件..."
# 删除服务文件
rm -f /etc/systemd/system/manager.service
systemctl daemon-reload 2>/dev/null || true

# 删除应用目录
rm -rf /root/manager

# 删除数据文件
rm -f /root/servers.json
rm -f /root/processes.json
rm -f /root/multi-server-processes.json

# 删除日志
rm -rf /var/log/manager
rm -rf /var/log/process-keeper

echo "🧹 清理防火墙..."
# 清理防火墙规则
ufw --force delete allow 3000 2>/dev/null || true
ufw --force delete allow 3001 2>/dev/null || true

echo "✅ 快速卸载完成！"
echo ""
echo "📝 注意："
echo "   - Node.js 和 PM2 已保留"
echo "   - SSH 配置已保留"
echo "   - 如需完全卸载，请使用 uninstall-debian.sh"
echo ""
echo "🔄 建议重启系统以确保所有更改生效"
