# 部署脚本更新说明

## 📋 更新概述

为了支持新的多服务器功能，我已经对部署相关的文件进行了全面更新。以下是详细的更新内容：

## 🔄 更新的文件

### 1. `deploy-debian.sh` - 主部署脚本
**更新内容：**
- ✅ 添加了多服务器功能说明
- ✅ 安装系统依赖（build-essential, python3, make, g++）
- ✅ 确保SSH客户端已安装
- ✅ 验证SSH2依赖包
- ✅ 创建多服务器相关的数据文件
- ✅ 设置适当的文件权限
- ✅ 更新了注意事项和功能说明

**新增功能：**
```bash
# 安装系统依赖 (多服务器功能需要)
apt-get install -y curl wget gnupg2 software-properties-common build-essential python3 make g++

# 安装 SSH 客户端
apt-get install -y openssh-client

# 验证多服务器功能依赖
npm list ssh2 || npm install ssh2 @types/ssh2

# 创建数据文件
touch /root/manager/servers.json
touch /root/manager/multi-server-processes.json
chmod 600 /root/manager/servers.json
```

### 2. `ecosystem.config.js` - PM2配置文件
**更新内容：**
- ✅ 添加多服务器功能环境变量
- ✅ 增加内存限制（1G → 2G）
- ✅ 更新日志文件路径
- ✅ 添加部署配置模板

**新增配置：**
```javascript
env: {
  SSH_TIMEOUT: 10000,
  MAX_SSH_CONNECTIONS: 10,
  HEARTBEAT_INTERVAL: 30000
},
max_memory_restart: '2G',
log_file: '/var/log/manager/combined.log'
```

### 3. `multi-server-setup.sh` - 新增脚本
**功能：**
- 🔑 SSH密钥生成和配置
- 🧪 SSH连接测试
- ⚙️ SSH配置优化
- 📚 使用指南和安全建议

**主要特性：**
- 自动生成SSH密钥对
- 创建优化的SSH配置文件
- 提供连接测试功能
- 显示详细的配置说明

### 4. `.env.example` - 新增环境变量示例
**包含配置：**
- 🔧 多服务器功能配置
- 🔒 安全配置选项
- 📊 监控和日志配置
- 📧 通知配置模板
- 🚀 性能优化选项

## 🚀 部署流程更新

### 标准部署流程
```bash
# 1. 下载项目
sudo git clone <repo-url> /root/manager
cd /root/manager

# 2. 运行主部署脚本
chmod +x deploy-debian.sh
sudo ./deploy-debian.sh

# 3. 配置多服务器功能 (可选)
chmod +x multi-server-setup.sh
sudo ./multi-server-setup.sh

# 4. 启动服务
systemctl start manager
```

### 环境变量配置
```bash
# 复制环境变量模板
cp .env.example .env

# 根据需要编辑配置
nano .env
```

## 🔧 新增功能支持

### SSH连接管理
- **自动SSH客户端安装**
- **SSH密钥生成和配置**
- **连接测试和验证**
- **安全配置优化**

### 数据文件管理
- **servers.json** - 服务器配置存储
- **multi-server-processes.json** - 远程进程数据
- **自动权限设置** (600权限保护敏感数据)

### 系统依赖
- **build-essential** - 编译工具链
- **python3** - Python运行时
- **openssh-client** - SSH客户端
- **Node.js原生模块支持**

## 📊 性能优化

### 内存管理
- PM2内存限制从1G增加到2G
- 支持更多并发SSH连接
- 优化的垃圾回收配置

### 连接管理
- SSH连接池复用
- 智能心跳检测
- 连接超时优化

## 🔒 安全增强

### 文件权限
```bash
chmod 600 /root/manager/servers.json          # 服务器配置
chmod 600 /root/manager/multi-server-processes.json  # 进程数据
chmod 700 /root/.ssh                          # SSH目录
chmod 600 /root/.ssh/id_rsa                   # 私钥
chmod 644 /root/.ssh/id_rsa.pub               # 公钥
```

### SSH安全配置
```
StrictHostKeyChecking no
UserKnownHostsFile /dev/null
PasswordAuthentication no
PubkeyAuthentication yes
ConnectTimeout 10
```

## 📝 使用说明

### 首次部署
1. 运行 `deploy-debian.sh` 进行基础部署
2. 运行 `multi-server-setup.sh` 配置SSH功能
3. 在Web界面中添加远程服务器
4. 开始管理多服务器进程

### 现有系统升级
1. 备份现有数据文件
2. 运行更新的部署脚本
3. 配置多服务器功能
4. 验证功能正常

### 故障排除
- 检查SSH连接配置
- 验证防火墙规则
- 查看系统日志
- 测试网络连通性

## 🎯 最佳实践

### 部署建议
1. 在测试环境先验证功能
2. 备份重要数据和配置
3. 使用SSH密钥而非密码认证
4. 定期更新系统和依赖

### 安全建议
1. 限制SSH访问权限
2. 使用非标准SSH端口
3. 配置防火墙规则
4. 定期审查访问日志

### 监控建议
1. 监控系统资源使用
2. 检查SSH连接状态
3. 定期备份配置数据
4. 设置告警通知

## 🔮 未来计划

### 即将添加的功能
- Docker容器部署支持
- Kubernetes集群管理
- 自动化CI/CD集成
- 高可用性配置

### 性能优化计划
- 连接池优化
- 缓存机制改进
- 异步处理增强
- 负载均衡支持

---

通过这些更新，部署脚本现在完全支持多服务器功能，提供了更好的安全性、性能和易用性。用户可以轻松地在Debian系统上部署和配置完整的多服务器进程管理环境。
