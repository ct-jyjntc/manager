#!/bin/bash

# Debian 系统卸载脚本
# 用于完全移除进程保活管理器及其相关组件

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${2}${1}${NC}"
}

print_message "🗑️  进程保活管理器卸载程序" "$BLUE"
print_message "================================" "$BLUE"

# 检查是否为 root 用户
if [[ $EUID -ne 0 ]]; then
   print_message "⚠️  请使用 root 用户运行此脚本" "$RED"
   print_message "   sudo ./uninstall-debian.sh" "$YELLOW"
   exit 1
fi

# 确认卸载
print_message "⚠️  警告：此操作将完全移除进程保活管理器及其所有数据！" "$RED"
print_message "📋 将要执行的操作：" "$YELLOW"
echo "   1. 停止并删除 systemd 服务"
echo "   2. 停止并删除 PM2 进程"
echo "   3. 删除应用程序文件"
echo "   4. 删除配置和数据文件"
echo "   5. 删除日志文件"
echo "   6. 清理防火墙规则"
echo "   7. 可选：删除 Node.js 和 PM2"
echo ""

read -p "确定要继续卸载吗？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_message "❌ 卸载已取消" "$YELLOW"
    exit 0
fi

echo ""
print_message "🚀 开始卸载进程保活管理器..." "$GREEN"

# 1. 停止并删除 systemd 服务
print_message "🛑 停止并删除 systemd 服务..." "$BLUE"
if systemctl is-active --quiet manager; then
    print_message "   停止 manager 服务..." "$YELLOW"
    systemctl stop manager
fi

if systemctl is-enabled --quiet manager 2>/dev/null; then
    print_message "   禁用 manager 服务..." "$YELLOW"
    systemctl disable manager
fi

if [ -f "/etc/systemd/system/manager.service" ]; then
    print_message "   删除服务文件..." "$YELLOW"
    rm -f /etc/systemd/system/manager.service
    systemctl daemon-reload
    print_message "   ✅ systemd 服务已删除" "$GREEN"
else
    print_message "   ℹ️  未找到 systemd 服务文件" "$YELLOW"
fi

# 2. 停止并删除 PM2 进程
print_message "🛑 停止并删除 PM2 进程..." "$BLUE"
if command -v pm2 &> /dev/null; then
    # 停止所有相关进程
    pm2 stop process-keeper 2>/dev/null || true
    pm2 delete process-keeper 2>/dev/null || true
    pm2 stop all 2>/dev/null || true
    pm2 kill 2>/dev/null || true
    print_message "   ✅ PM2 进程已停止" "$GREEN"
else
    print_message "   ℹ️  PM2 未安装或已删除" "$YELLOW"
fi

# 3. 删除应用程序文件
print_message "🗂️  删除应用程序文件..." "$BLUE"
APP_DIRS=(
    "/root/manager"
    "/opt/manager"
    "/usr/local/manager"
)

for dir in "${APP_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_message "   删除目录: $dir" "$YELLOW"
        rm -rf "$dir"
        print_message "   ✅ 已删除: $dir" "$GREEN"
    fi
done

# 4. 删除配置和数据文件
print_message "🗂️  删除配置和数据文件..." "$BLUE"
CONFIG_FILES=(
    "/root/servers.json"
    "/root/processes.json"
    "/root/multi-server-processes.json"
    "/root/.pm2"
    "/home/*/servers.json"
    "/home/*/processes.json"
    "/home/*/multi-server-processes.json"
)

for file_pattern in "${CONFIG_FILES[@]}"; do
    for file in $file_pattern; do
        if [ -f "$file" ] || [ -d "$file" ]; then
            print_message "   删除: $file" "$YELLOW"
            rm -rf "$file"
        fi
    done
done
print_message "   ✅ 配置文件已删除" "$GREEN"

# 5. 删除日志文件
print_message "📝 删除日志文件..." "$BLUE"
LOG_DIRS=(
    "/var/log/manager"
    "/var/log/process-keeper"
    "/var/log/pm2"
)

for dir in "${LOG_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_message "   删除日志目录: $dir" "$YELLOW"
        rm -rf "$dir"
        print_message "   ✅ 已删除: $dir" "$GREEN"
    fi
done

# 6. 清理防火墙规则
print_message "🔥 清理防火墙规则..." "$BLUE"
if command -v ufw &> /dev/null; then
    # 删除可能的UFW规则
    ufw --force delete allow 3000 2>/dev/null || true
    ufw --force delete allow 3001 2>/dev/null || true
    print_message "   ✅ UFW 规则已清理" "$GREEN"
elif command -v iptables &> /dev/null; then
    # 删除可能的iptables规则
    iptables -D INPUT -p tcp --dport 3000 -j ACCEPT 2>/dev/null || true
    iptables -D INPUT -p tcp --dport 3001 -j ACCEPT 2>/dev/null || true
    print_message "   ✅ iptables 规则已清理" "$GREEN"
else
    print_message "   ℹ️  未检测到防火墙配置" "$YELLOW"
fi

# 7. 清理临时文件和缓存
print_message "🧹 清理临时文件..." "$BLUE"
TEMP_DIRS=(
    "/tmp/manager*"
    "/tmp/process-keeper*"
    "/tmp/npm-*"
)

for pattern in "${TEMP_DIRS[@]}"; do
    for item in $pattern; do
        if [ -e "$item" ]; then
            rm -rf "$item"
        fi
    done
done
print_message "   ✅ 临时文件已清理" "$GREEN"

# 8. 询问是否删除 Node.js 和相关工具
echo ""
print_message "🤔 可选清理项目" "$BLUE"
print_message "=================" "$BLUE"

read -p "是否要删除 Node.js？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_message "🗑️  删除 Node.js..." "$BLUE"
    apt-get remove --purge -y nodejs npm 2>/dev/null || true
    apt-get autoremove -y 2>/dev/null || true
    
    # 删除 Node.js 相关目录
    rm -rf /usr/local/lib/node_modules 2>/dev/null || true
    rm -rf /usr/local/bin/node 2>/dev/null || true
    rm -rf /usr/local/bin/npm 2>/dev/null || true
    rm -rf /root/.npm 2>/dev/null || true
    rm -rf /home/*/.npm 2>/dev/null || true
    
    print_message "   ✅ Node.js 已删除" "$GREEN"
fi

read -p "是否要删除 PM2？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_message "🗑️  删除 PM2..." "$BLUE"
    npm uninstall -g pm2 2>/dev/null || true
    rm -rf /root/.pm2 2>/dev/null || true
    rm -rf /home/*/.pm2 2>/dev/null || true
    print_message "   ✅ PM2 已删除" "$GREEN"
fi

read -p "是否要删除 SSH 密钥？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_message "🔑 删除 SSH 密钥..." "$BLUE"
    
    # 备份现有密钥
    if [ -f "/root/.ssh/id_rsa" ]; then
        BACKUP_DIR="/root/ssh_backup_$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        cp -r /root/.ssh/* "$BACKUP_DIR/" 2>/dev/null || true
        print_message "   📦 SSH 密钥已备份到: $BACKUP_DIR" "$YELLOW"
    fi
    
    # 删除进程管理器相关的SSH配置
    if [ -f "/root/.ssh/config" ]; then
        # 创建备份
        cp /root/.ssh/config /root/.ssh/config.backup
        # 移除进程管理器相关配置（如果有特定标识）
        sed -i '/# SSH配置文件 - 进程管理器多服务器功能/,/^$/d' /root/.ssh/config 2>/dev/null || true
    fi
    
    print_message "   ✅ SSH 配置已清理（原配置已备份）" "$GREEN"
fi

# 9. 验证卸载结果
print_message "🔍 验证卸载结果..." "$BLUE"

# 检查服务状态
if systemctl list-units --full -all | grep -q "manager.service"; then
    print_message "   ⚠️  systemd 服务可能仍然存在" "$YELLOW"
else
    print_message "   ✅ systemd 服务已完全删除" "$GREEN"
fi

# 检查进程
if pgrep -f "manager\|process-keeper" > /dev/null; then
    print_message "   ⚠️  仍有相关进程在运行" "$YELLOW"
    print_message "   运行中的进程:" "$YELLOW"
    pgrep -f "manager\|process-keeper" | xargs ps -p
else
    print_message "   ✅ 没有相关进程在运行" "$GREEN"
fi

# 检查端口占用
if netstat -tlnp 2>/dev/null | grep -q ":3000\|:3001"; then
    print_message "   ⚠️  端口 3000/3001 仍被占用" "$YELLOW"
else
    print_message "   ✅ 端口已释放" "$GREEN"
fi

# 10. 生成卸载报告
REPORT_FILE="/tmp/manager_uninstall_report_$(date +%Y%m%d_%H%M%S).txt"
print_message "📋 生成卸载报告..." "$BLUE"

cat > "$REPORT_FILE" << EOF
进程保活管理器卸载报告
======================
卸载时间: $(date)
操作系统: $(lsb_release -d 2>/dev/null | cut -f2 || echo "Unknown")
卸载用户: $(whoami)

已删除的组件:
- systemd 服务文件
- PM2 进程
- 应用程序文件
- 配置和数据文件
- 日志文件
- 防火墙规则
- 临时文件

备份位置:
$(find /root -name "ssh_backup_*" -type d 2>/dev/null || echo "无SSH备份")

注意事项:
1. 如果需要重新安装，请运行 deploy-debian.sh
2. SSH密钥备份位置已在上方列出
3. 建议重启系统以确保所有更改生效
4. 如有问题，请检查系统日志: journalctl -xe

EOF

print_message "   ✅ 卸载报告已生成: $REPORT_FILE" "$GREEN"

# 完成
echo ""
print_message "🎉 卸载完成！" "$GREEN"
print_message "================================" "$GREEN"
print_message "📋 卸载总结:" "$BLUE"
echo "   ✅ 服务已停止并删除"
echo "   ✅ 应用文件已清理"
echo "   ✅ 配置数据已删除"
echo "   ✅ 日志文件已清理"
echo "   ✅ 防火墙规则已清理"
echo ""
print_message "📄 详细报告: $REPORT_FILE" "$BLUE"
print_message "🔄 建议重启系统以确保所有更改生效" "$YELLOW"
echo ""
print_message "感谢使用进程保活管理器！" "$GREEN"
