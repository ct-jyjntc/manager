# 进程保活管理器

一个现代化的进程监控和管理系统，使用 Next.js + React 构建，具有美观的用户界面和完整的进程管理功能。

## 功能特性

### 🚀 核心功能
- **进程创建**: 通过网页界面添加新的进程管理任务
- **进程控制**: 启动、停止、重启、删除进程
- **实时监控**: 查看进程状态、运行时间、PID等信息
- **日志管理**: 查看进程运行日志，支持下载和清除
- **自动重启**: 支持进程异常退出后自动重启
- **配置管理**: 导入和导出进程配置，支持备份和迁移

### 🎨 现代化界面
- **响应式设计**: 适配桌面和移动设备
- **暗色主题**: 支持明暗主题切换
- **Radix UI**: 使用 Radix UI 组件库，提供无障碍访问
- **Tailwind CSS**: 现代化的样式框架
- **Lucide 图标**: 美观的图标系统

## 技术栈

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI 组件**: Radix UI
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **状态管理**: React Hooks

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 访问应用
打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 使用指南

### 添加新进程
1. 在"添加新进程"卡片中填入进程名称
2. 输入要执行的命令（例如：`python3 /root/app.py`）
3. 点击"创建进程"按钮

### 管理进程
每个进程卡片提供以下操作：
- **启动**: 启动停止的进程
- **停止**: 停止正在运行的进程
- **重启**: 重启进程（停止后重新启动）
- **日志**: 查看进程运行日志
- **删除**: 删除进程（会先停止进程）

### 查看日志
- 点击进程卡片中的"日志"按钮
- 在弹出的日志窗口中查看详细的运行日志
- 支持下载日志文件
- 支持清除历史日志

### 配置管理
- 点击页面右上角的"配置管理"按钮
- **导出配置**: 将当前所有进程配置导出为 JSON 文件，可用于备份
- **导入配置**: 从 JSON 文件批量导入进程配置，同名进程会被跳过
- 配置文件包含进程名称、命令、工作目录和自动重启设置
- 不包含运行状态、日志等运行时数据

## 项目结构

```
.
├── app/
│   ├── api/
│   │   └── processes/          # API 路由
│   ├── globals.css             # 全局样式
│   ├── layout.tsx              # 根布局
│   └── page.tsx                # 主页面
├── components/
│   ├── ui/                     # UI 组件
│   └── process-logs.tsx        # 日志查看组件
├── lib/
│   ├── utils.ts                # 工具函数
│   ├── process-manager.ts      # 进程管理器
│   └── real-process-manager.ts # 实际进程管理逻辑
├── types/
│   └── process.ts              # 类型定义
└── README.md
```

## API 接口

### 获取进程列表
```
GET /api/processes
```

### 创建新进程
```
POST /api/processes
Content-Type: application/json

{
  "name": "进程名称",
  "command": "执行命令",
  "autoRestart": true,
  "cwd": "/optional/path/to/working/directory"
}
```

### 获取单个进程信息
```
GET /api/processes/{id}
```

### 控制进程
```
POST /api/processes/{id}
Content-Type: application/json

{
  "action": "start|stop|restart"
}
```

### 删除进程
```
DELETE /api/processes/{id}
```

### 导出配置
```
GET /api/processes/export
```

### 导入配置
```
POST /api/processes/import
Content-Type: application/json

{
  "version": "1.0",
  "exportTime": "2025-05-31T10:30:00.000Z",
  "processes": [
    {
      "name": "进程名称",
      "command": "执行命令",
      "autoRestart": true,
      "cwd": "/optional/path/to/working/directory"
    }
  ]
}
```

## Debian 系统部署

### 自动部署 (推荐)

1. **下载项目到 Debian 服务器**:
   确保项目位于 `/root/manager` 目录。
   例如，将项目克隆到该位置：
```bash
sudo mkdir -p /root/manager
sudo git clone <your-repo-url> /root/manager
cd /root/manager
# 如果您已在其他位置克隆了项目，请将其移动或复制到 /root/manager
# 例如: sudo mv /path/to/your/cloned/project-directory /root/manager
# 然后: cd /root/manager
```

2. **运行自动部署脚本**:
```bash
chmod +x deploy-debian.sh
sudo ./deploy-debian.sh
```

3. **访问应用**:
```
http://your-server-ip:3000
```

### 手动部署

1. **安装 Node.js 18**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs
```

2. **安装依赖并构建**:
```bash
npm install
npm run build
```

3. **启动生产服务**:
```bash
npm start
# 或使用 PM2
npm install -g pm2
pm2 start ecosystem.config.js
```

### 系统服务配置

项目将自动配置为 systemd 服务，可以使用以下命令管理：

```bash
# 启动服务
sudo systemctl start manager

# 停止服务
sudo systemctl stop manager

# 重启服务
sudo systemctl restart manager

# 查看状态
sudo systemctl status manager

# 查看日志
sudo journalctl -u manager -f
```

## 卸载说明

### 完全卸载
如果需要完全移除进程保活管理器及其所有组件：

```bash
chmod +x uninstall-debian.sh
sudo ./uninstall-debian.sh
```

**完全卸载将删除：**
- systemd 服务
- PM2 进程
- 应用程序文件
- 配置和数据文件
- 日志文件
- 防火墙规则
- 可选：Node.js、PM2、SSH密钥

### 快速卸载
如果只想移除应用程序（保留Node.js等系统组件）：

```bash
chmod +x quick-uninstall.sh
sudo ./quick-uninstall.sh
```

**快速卸载将删除：**
- 应用程序文件
- 配置数据
- 服务配置
- 日志文件

**保留：**
- Node.js 和 npm
- PM2
- SSH 配置

## 注意事项

✅ **真实进程管理**: 当前版本使用真实的 Node.js `child_process` 模块，可以在 Debian 系统上实际启动和管理进程。

⚠️ **安全注意事项**:

1. 建议配置防火墙规则
2. 添加用户认证和授权
3. 配置 HTTPS/SSL 证书
4. 限制可执行的命令类型
5. 定期备份进程配置数据

## 开发说明

### 自定义配置
- 修改 `tailwind.config.ts` 来自定义样式主题
- 编辑 `lib/process-manager.ts` 来扩展进程管理功能
- 在 `types/process.ts` 中添加新的类型定义

### 构建生产版本
```bash
npm run build
npm start
```

## 许可证

MIT License
