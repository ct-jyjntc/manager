#!/bin/bash

# 多服务器功能配置脚本
# 用于配置SSH密钥和远程服务器访问

set -e

echo "🔐 多服务器功能配置向导"
echo "================================"

# 检查是否为 root 用户
if [[ $EUID -ne 0 ]]; then
   echo "⚠️  请使用 root 用户运行此脚本"
   echo "   sudo ./multi-server-setup.sh"
   exit 1
fi

# 创建SSH密钥目录
SSH_DIR="/root/.ssh"
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

echo ""
echo "🔑 SSH密钥配置"
echo "==============="

# 检查是否已有SSH密钥
if [ -f "$SSH_DIR/id_rsa" ]; then
    echo "✅ 发现现有SSH密钥: $SSH_DIR/id_rsa"
    read -p "是否要创建新的SSH密钥？(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        GENERATE_KEY=true
    else
        GENERATE_KEY=false
    fi
else
    echo "📝 未发现SSH密钥，将创建新密钥"
    GENERATE_KEY=true
fi

# 生成SSH密钥
if [ "$GENERATE_KEY" = true ]; then
    echo "🔨 生成SSH密钥..."
    ssh-keygen -t rsa -b 4096 -f "$SSH_DIR/id_rsa" -N "" -C "process-manager@$(hostname)"
    chmod 600 "$SSH_DIR/id_rsa"
    chmod 644 "$SSH_DIR/id_rsa.pub"
    echo "✅ SSH密钥已生成"
fi

echo ""
echo "📋 公钥内容 (需要添加到目标服务器):"
echo "================================"
cat "$SSH_DIR/id_rsa.pub"
echo "================================"

echo ""
echo "📖 配置远程服务器步骤:"
echo "1. 复制上面的公钥内容"
echo "2. 登录到目标服务器"
echo "3. 将公钥添加到 ~/.ssh/authorized_keys 文件"
echo "4. 确保目标服务器SSH服务正在运行"
echo ""

# 测试SSH连接功能
echo "🧪 SSH连接测试"
echo "=============="
read -p "是否要测试SSH连接？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "请输入目标服务器IP地址: " TARGET_HOST
    read -p "请输入SSH用户名 (默认: root): " SSH_USER
    SSH_USER=${SSH_USER:-root}
    
    echo "🔍 测试连接到 $SSH_USER@$TARGET_HOST..."
    
    if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SSH_USER@$TARGET_HOST" "echo 'SSH连接测试成功'" 2>/dev/null; then
        echo "✅ SSH连接测试成功！"
    else
        echo "❌ SSH连接测试失败"
        echo "请检查："
        echo "1. 目标服务器IP地址是否正确"
        echo "2. SSH服务是否在目标服务器上运行"
        echo "3. 公钥是否已正确添加到目标服务器"
        echo "4. 网络连接是否正常"
    fi
fi

echo ""
echo "🔧 SSH配置优化"
echo "============="

# 创建SSH配置文件
SSH_CONFIG="$SSH_DIR/config"
if [ ! -f "$SSH_CONFIG" ]; then
    echo "📝 创建SSH配置文件..."
    cat > "$SSH_CONFIG" << 'EOF'
# SSH配置文件 - 进程管理器多服务器功能
Host *
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    ConnectTimeout 10
    ServerAliveInterval 60
    ServerAliveCountMax 3
    PasswordAuthentication no
    PubkeyAuthentication yes
    IdentityFile ~/.ssh/id_rsa
EOF
    chmod 600 "$SSH_CONFIG"
    echo "✅ SSH配置文件已创建"
else
    echo "✅ SSH配置文件已存在"
fi

echo ""
echo "🛡️  安全建议"
echo "==========="
echo "1. 定期更换SSH密钥"
echo "2. 在目标服务器上禁用密码认证"
echo "3. 使用非标准SSH端口"
echo "4. 配置防火墙规则"
echo "5. 定期检查SSH访问日志"

echo ""
echo "📚 使用说明"
echo "==========="
echo "1. 启动进程管理器服务"
echo "2. 在Web界面中点击'服务器'按钮"
echo "3. 添加新服务器时选择'使用SSH密钥'认证方式"
echo "4. 输入服务器信息并测试连接"

echo ""
echo "🎉 多服务器功能配置完成！"
echo ""
echo "📁 重要文件位置："
echo "   SSH私钥: $SSH_DIR/id_rsa"
echo "   SSH公钥: $SSH_DIR/id_rsa.pub"
echo "   SSH配置: $SSH_DIR/config"
echo ""
echo "⚠️  请妥善保管SSH私钥文件！"
