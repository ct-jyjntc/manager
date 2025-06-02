#!/bin/bash

# 卸载功能测试脚本
# 用于验证卸载脚本的功能和安全性

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_message() {
    echo -e "${2}${1}${NC}"
}

print_message "🧪 卸载功能测试脚本" "$BLUE"
print_message "===================" "$BLUE"

# 检查是否为 root 用户
if [[ $EUID -ne 0 ]]; then
   print_message "⚠️  请使用 root 用户运行此脚本" "$RED"
   exit 1
fi

# 测试函数
test_file_exists() {
    local file=$1
    local description=$2
    if [ -f "$file" ] || [ -d "$file" ]; then
        print_message "✅ $description: 存在" "$GREEN"
        return 0
    else
        print_message "❌ $description: 不存在" "$RED"
        return 1
    fi
}

test_service_status() {
    local service=$1
    if systemctl is-active --quiet "$service"; then
        print_message "✅ 服务 $service: 运行中" "$GREEN"
        return 0
    else
        print_message "❌ 服务 $service: 未运行" "$RED"
        return 1
    fi
}

test_port_listening() {
    local port=$1
    if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        print_message "✅ 端口 $port: 被占用" "$GREEN"
        return 0
    else
        print_message "❌ 端口 $port: 未被占用" "$RED"
        return 1
    fi
}

# 1. 安装前状态检查
print_message "📋 1. 安装前状态检查" "$BLUE"
print_message "===================" "$BLUE"

INITIAL_STATE=()

# 检查关键文件
FILES_TO_CHECK=(
    "/root/manager"
    "/etc/systemd/system/manager.service"
    "/var/log/manager"
    "/root/servers.json"
    "/root/processes.json"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if test_file_exists "$file" "文件/目录 $file"; then
        INITIAL_STATE+=("$file:exists")
    else
        INITIAL_STATE+=("$file:missing")
    fi
done

# 检查服务状态
if test_service_status "manager"; then
    INITIAL_STATE+=("service:running")
else
    INITIAL_STATE+=("service:stopped")
fi

# 检查端口
if test_port_listening "3000"; then
    INITIAL_STATE+=("port3000:listening")
else
    INITIAL_STATE+=("port3000:free")
fi

echo ""

# 2. 模拟安装（如果需要）
print_message "📦 2. 检查是否需要模拟安装" "$BLUE"
print_message "=========================" "$BLUE"

if [ ! -d "/root/manager" ]; then
    print_message "⚠️  未检测到安装，创建模拟环境..." "$YELLOW"
    
    # 创建模拟文件和目录
    mkdir -p /root/manager
    echo "模拟应用文件" > /root/manager/app.js
    echo "模拟配置" > /root/servers.json
    echo "模拟进程数据" > /root/processes.json
    mkdir -p /var/log/manager
    echo "模拟日志" > /var/log/manager/app.log
    
    # 创建模拟服务文件
    cat > /etc/systemd/system/manager.service << 'EOF'
[Unit]
Description=Process Manager
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/manager
ExecStart=/usr/bin/node app.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    print_message "✅ 模拟环境已创建" "$GREEN"
else
    print_message "✅ 检测到现有安装" "$GREEN"
fi

echo ""

# 3. 测试快速卸载
print_message "🚀 3. 测试快速卸载功能" "$BLUE"
print_message "=====================" "$BLUE"

if [ -f "./quick-uninstall.sh" ]; then
    print_message "📝 运行快速卸载脚本..." "$YELLOW"
    
    # 自动回答 'y' 来确认卸载
    echo "y" | ./quick-uninstall.sh
    
    print_message "🔍 验证快速卸载结果..." "$YELLOW"
    
    # 检查应该被删除的文件
    QUICK_UNINSTALL_CHECKS=0
    QUICK_UNINSTALL_TOTAL=5
    
    if [ ! -d "/root/manager" ]; then
        print_message "✅ 应用目录已删除" "$GREEN"
        ((QUICK_UNINSTALL_CHECKS++))
    else
        print_message "❌ 应用目录仍存在" "$RED"
    fi
    
    if [ ! -f "/etc/systemd/system/manager.service" ]; then
        print_message "✅ 服务文件已删除" "$GREEN"
        ((QUICK_UNINSTALL_CHECKS++))
    else
        print_message "❌ 服务文件仍存在" "$RED"
    fi
    
    if [ ! -d "/var/log/manager" ]; then
        print_message "✅ 日志目录已删除" "$GREEN"
        ((QUICK_UNINSTALL_CHECKS++))
    else
        print_message "❌ 日志目录仍存在" "$RED"
    fi
    
    if ! systemctl is-active --quiet manager; then
        print_message "✅ 服务已停止" "$GREEN"
        ((QUICK_UNINSTALL_CHECKS++))
    else
        print_message "❌ 服务仍在运行" "$RED"
    fi
    
    if ! netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
        print_message "✅ 端口已释放" "$GREEN"
        ((QUICK_UNINSTALL_CHECKS++))
    else
        print_message "❌ 端口仍被占用" "$RED"
    fi
    
    print_message "📊 快速卸载测试结果: $QUICK_UNINSTALL_CHECKS/$QUICK_UNINSTALL_TOTAL" "$BLUE"
    
    if [ $QUICK_UNINSTALL_CHECKS -eq $QUICK_UNINSTALL_TOTAL ]; then
        print_message "🎉 快速卸载测试通过！" "$GREEN"
    else
        print_message "⚠️  快速卸载测试部分失败" "$YELLOW"
    fi
else
    print_message "❌ 快速卸载脚本不存在" "$RED"
fi

echo ""

# 4. 重新创建环境用于完全卸载测试
print_message "🔄 4. 重新创建测试环境" "$BLUE"
print_message "=====================" "$BLUE"

# 重新创建文件用于完全卸载测试
mkdir -p /root/manager
echo "模拟应用文件" > /root/manager/app.js
echo "模拟配置" > /root/servers.json
echo "模拟进程数据" > /root/processes.json
mkdir -p /var/log/manager
echo "模拟日志" > /var/log/manager/app.log

# 创建模拟 PM2 目录
mkdir -p /root/.pm2
echo "模拟PM2配置" > /root/.pm2/dump.pm2

print_message "✅ 测试环境已重新创建" "$GREEN"

echo ""

# 5. 测试完全卸载（模拟）
print_message "🗑️  5. 测试完全卸载功能" "$BLUE"
print_message "=====================" "$BLUE"

if [ -f "./uninstall-debian.sh" ]; then
    print_message "📝 模拟完全卸载脚本运行..." "$YELLOW"
    
    # 检查脚本语法
    if bash -n ./uninstall-debian.sh; then
        print_message "✅ 完全卸载脚本语法正确" "$GREEN"
    else
        print_message "❌ 完全卸载脚本语法错误" "$RED"
    fi
    
    # 检查关键功能（不实际运行，只检查脚本内容）
    SCRIPT_CHECKS=0
    SCRIPT_TOTAL=8
    
    if grep -q "systemctl stop" ./uninstall-debian.sh; then
        print_message "✅ 包含服务停止功能" "$GREEN"
        ((SCRIPT_CHECKS++))
    fi
    
    if grep -q "rm -rf.*manager" ./uninstall-debian.sh; then
        print_message "✅ 包含文件删除功能" "$GREEN"
        ((SCRIPT_CHECKS++))
    fi
    
    if grep -q "防火墙" ./uninstall-debian.sh; then
        print_message "✅ 包含防火墙清理功能" "$GREEN"
        ((SCRIPT_CHECKS++))
    fi
    
    if grep -q "备份" ./uninstall-debian.sh; then
        print_message "✅ 包含备份功能" "$GREEN"
        ((SCRIPT_CHECKS++))
    fi
    
    if grep -q "确认" ./uninstall-debian.sh; then
        print_message "✅ 包含用户确认功能" "$GREEN"
        ((SCRIPT_CHECKS++))
    fi
    
    if grep -q "报告" ./uninstall-debian.sh; then
        print_message "✅ 包含报告生成功能" "$GREEN"
        ((SCRIPT_CHECKS++))
    fi
    
    if grep -q "EUID" ./uninstall-debian.sh; then
        print_message "✅ 包含权限检查功能" "$GREEN"
        ((SCRIPT_CHECKS++))
    fi
    
    if grep -q "验证" ./uninstall-debian.sh; then
        print_message "✅ 包含结果验证功能" "$GREEN"
        ((SCRIPT_CHECKS++))
    fi
    
    print_message "📊 完全卸载脚本检查结果: $SCRIPT_CHECKS/$SCRIPT_TOTAL" "$BLUE"
    
    if [ $SCRIPT_CHECKS -eq $SCRIPT_TOTAL ]; then
        print_message "🎉 完全卸载脚本检查通过！" "$GREEN"
    else
        print_message "⚠️  完全卸载脚本检查部分失败" "$YELLOW"
    fi
else
    print_message "❌ 完全卸载脚本不存在" "$RED"
fi

echo ""

# 6. 清理测试环境
print_message "🧹 6. 清理测试环境" "$BLUE"
print_message "=================" "$BLUE"

rm -rf /root/manager
rm -f /root/servers.json
rm -f /root/processes.json
rm -rf /var/log/manager
rm -rf /root/.pm2
rm -f /etc/systemd/system/manager.service
systemctl daemon-reload 2>/dev/null || true

print_message "✅ 测试环境已清理" "$GREEN"

echo ""

# 7. 生成测试报告
print_message "📋 7. 生成测试报告" "$BLUE"
print_message "=================" "$BLUE"

REPORT_FILE="/tmp/uninstall_test_report_$(date +%Y%m%d_%H%M%S).txt"

cat > "$REPORT_FILE" << EOF
卸载功能测试报告
===============
测试时间: $(date)
测试用户: $(whoami)
系统信息: $(lsb_release -d 2>/dev/null | cut -f2 || echo "Unknown")

测试结果:
- 快速卸载脚本: $([ -f "./quick-uninstall.sh" ] && echo "存在" || echo "缺失")
- 完全卸载脚本: $([ -f "./uninstall-debian.sh" ] && echo "存在" || echo "缺失")
- 快速卸载功能: $([ ${QUICK_UNINSTALL_CHECKS:-0} -eq ${QUICK_UNINSTALL_TOTAL:-0} ] && echo "通过" || echo "失败")
- 完全卸载检查: $([ ${SCRIPT_CHECKS:-0} -eq ${SCRIPT_TOTAL:-0} ] && echo "通过" || echo "失败")

建议:
1. 在生产环境使用前进行完整测试
2. 确保备份重要数据
3. 在非生产环境验证卸载流程
4. 定期检查脚本更新

EOF

print_message "✅ 测试报告已生成: $REPORT_FILE" "$GREEN"

echo ""
print_message "🎉 卸载功能测试完成！" "$GREEN"
print_message "=====================" "$GREEN"

# 显示总结
echo "📊 测试总结:"
echo "   - 快速卸载脚本: $([ -f "./quick-uninstall.sh" ] && echo "✅ 可用" || echo "❌ 缺失")"
echo "   - 完全卸载脚本: $([ -f "./uninstall-debian.sh" ] && echo "✅ 可用" || echo "❌ 缺失")"
echo "   - 功能完整性: $([ ${SCRIPT_CHECKS:-0} -ge 6 ] && echo "✅ 良好" || echo "⚠️  需要改进")"
echo ""
echo "📄 详细报告: $REPORT_FILE"
