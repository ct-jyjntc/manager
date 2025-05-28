// PM2 配置文件 - 用于生产环境部署
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
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_file: '/var/log/process-keeper/combined.log',
      out_file: '/var/log/process-keeper/out.log',
      error_file: '/var/log/process-keeper/error.log',
      time: true
    }
  ]
};