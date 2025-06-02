// PM2 配置文件 - 用于生产环境部署 (支持多服务器功能)
module.exports = {
  apps: [
    {
      name: 'process-keeper',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // 多服务器功能环境变量
        SSH_TIMEOUT: 10000,
        MAX_SSH_CONNECTIONS: 10,
        HEARTBEAT_INTERVAL: 30000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        SSH_TIMEOUT: 10000,
        MAX_SSH_CONNECTIONS: 10,
        HEARTBEAT_INTERVAL: 30000
      },
      log_file: '/var/log/manager/combined.log',
      out_file: '/var/log/manager/out.log',
      error_file: '/var/log/manager/error.log',
      time: true,
      // 多服务器功能需要更多内存
      max_memory_restart: '2G',
      // 启用集群模式以处理更多连接
      exec_mode: 'fork',
      // 环境变量文件
      env_file: '.env'
    }
  ],

  // 部署配置 (可选)
  deploy: {
    production: {
      user: 'root',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'your-git-repo-url',
      path: '/root/manager',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install -y git nodejs npm'
    }
  }
};