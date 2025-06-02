#!/bin/bash

# Debian 系统卸载脚本
# 用于完全卸载进程保活管理器

set -e

echo "🗑️  开始卸载进程保活管理器..."

# 检查是否为 root 用户
if [[ $EUID -ne 0 ]]; then
   echo "⚠️  请使用 root 用户运行此脚本"
   echo "   sudo ./uninstall-debian.sh"
   exit 1
fi

# 询问确认
echo "⚠️  警告：此操作将完全删除进程保活管理器及其所有数据！"
echo "   包括："
echo "   - 停止并删除 systemd 服务"
echo "   - 删除应用程序文件"
echo "   - 删除日志文件"
echo "   - 删除配置文件"
echo ""
read -p "确定要继续吗？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 卸载已取消"
    exit 0
fi

echo ""
echo "🛑 停止服务..."

# 停止服务
if systemctl is-active --quiet manager; then
    echo "   停止 manager 服务..."
    systemctl stop manager
    echo "   ✅ 服务已停止"
else
    echo "   ℹ️  服务未运行"
fi

# 禁用服务
if systemctl is-enabled --quiet manager; then
    echo "   禁用 manager 服务..."
    systemctl disable manager
    echo "   ✅ 服务已禁用"
else
    echo "   ℹ️  服务未启用"
fi

# 删除 systemd 服务文件
echo "🗑️  删除 systemd 服务文件..."
if [ -f "/etc/systemd/system/manager.service" ]; then
    rm -f /etc/systemd/system/manager.service
    echo "   ✅ 已删除 /etc/systemd/system/manager.service"
else
    echo "   ℹ️  服务文件不存在"
fi

# 重新加载 systemd
systemctl daemon-reload
echo "   ✅ 已重新加载 systemd"

# 删除应用程序目录
echo "🗑️  删除应用程序文件..."
if [ -d "/root/manager" ]; then
    echo "   删除 /root/manager 目录..."
    rm -rf /root/manager
    echo "   ✅ 已删除应用程序目录"
else
    echo "   ℹ️  应用程序目录不存在"
fi

# 删除日志目录
echo "🗑️  删除日志文件..."
if [ -d "/var/log/manager" ]; then
    echo "   删除 /var/log/manager 目录..."
    rm -rf /var/log/manager
    echo "   ✅ 已删除日志目录"
else
    echo "   ℹ️  日志目录不存在"
fi

# 删除 PM2 进程（如果存在）
echo "🗑️  清理 PM2 进程..."
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "process-keeper"; then
        echo "   停止并删除 PM2 进程..."
        pm2 stop process-keeper 2>/dev/null || true
        pm2 delete process-keeper 2>/dev/null || true
        pm2 save 2>/dev/null || true
        echo "   ✅ 已清理 PM2 进程"
    else
        echo "   ℹ️  未找到 PM2 进程"
    fi
else
    echo "   ℹ️  PM2 未安装"
fi

# 询问是否删除 Node.js 和 PM2
echo ""
echo "🤔 可选清理项："
read -p "是否卸载 Node.js？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "   卸载 Node.js..."
    apt-get remove -y nodejs npm
    echo "   ✅ 已卸载 Node.js"
fi

read -p "是否卸载 PM2？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v pm2 &> /dev/null; then
        echo "   卸载 PM2..."
        npm uninstall -g pm2 2>/dev/null || true
        echo "   ✅ 已卸载 PM2"
    else
        echo "   ℹ️  PM2 未安装"
    fi
fi

# 清理防火墙规则（如果使用 ufw）
if command -v ufw &> /dev/null; then
    echo "🔥 清理防火墙规则..."
    read -p "是否删除端口 3000 的防火墙规则？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ufw delete allow 3000/tcp 2>/dev/null || true
        echo "   ✅ 已删除防火墙规则"
    fi
fi

echo ""
echo "✅ 卸载完成！"
echo ""
echo "📝 卸载摘要："
echo "   ✅ 已停止并删除 systemd 服务"
echo "   ✅ 已删除应用程序文件"
echo "   ✅ 已删除日志文件"
echo "   ✅ 已清理 PM2 进程"
echo ""
echo "🎉 进程保活管理器已完全卸载！"