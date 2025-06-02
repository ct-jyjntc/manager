import { Server, ServerStats, CreateServerRequest, ServerConnectionTest } from '@/types/process';
import fs from 'fs';
import path from 'path';

// 动态导入SSH2以避免构建问题
let Client: any = null;
try {
  if (typeof window === 'undefined') {
    // 只在服务器端导入
    const ssh2 = require('ssh2');
    Client = ssh2.Client;
  }
} catch (error) {
  console.warn('SSH2 not available:', error);
}

interface ServerWithConnection extends Server {
  connection?: any;
  lastHeartbeat?: Date;
}

// 服务器管理器
class ServerManager {
  private servers: Map<string, ServerWithConnection> = new Map();
  private dataFile = path.join(process.cwd(), 'servers.json');
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadServers();
    this.initializeLocalServer();
    this.startHeartbeat();
  }

  // 初始化本地服务器
  private initializeLocalServer() {
    const localServerId = 'local';
    if (!this.servers.has(localServerId)) {
      const localServer: ServerWithConnection = {
        id: localServerId,
        name: '本地服务器',
        host: 'localhost',
        port: 22,
        username: 'root',
        status: 'online',
        createdAt: new Date().toISOString(),
        description: '本地服务器（当前系统）',
        isLocal: true,
        tags: ['local', 'default']
      };
      this.servers.set(localServerId, localServer);
      this.saveServers();
    }
  }

  // 从文件加载服务器数据
  private loadServers() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = fs.readFileSync(this.dataFile, 'utf-8');
        const serverData = JSON.parse(data);
        for (const [id, server] of Object.entries(serverData)) {
          this.servers.set(id, server as ServerWithConnection);
        }
      }
    } catch (error) {
      console.error('加载服务器数据失败:', error);
    }
  }

  // 保存服务器数据到文件
  private saveServers() {
    try {
      const serverData: Record<string, Server> = {};
      for (const [id, server] of this.servers) {
        // 不保存连接对象和敏感信息
        const { connection, lastHeartbeat, password, privateKey, ...serverData_ } = server;
        serverData[id] = serverData_;
      }
      fs.writeFileSync(this.dataFile, JSON.stringify(serverData, null, 2));
    } catch (error) {
      console.error('保存服务器数据失败:', error);
    }
  }

  // 启动心跳检测
  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      this.checkAllServersHealth();
    }, 30000); // 每30秒检查一次
  }

  // 检查所有服务器健康状态
  private async checkAllServersHealth() {
    for (const [id, server] of this.servers) {
      if (server.isLocal) {
        // 本地服务器始终在线
        server.status = 'online';
        server.lastHeartbeat = new Date();
        continue;
      }

      try {
        const isHealthy = await this.testConnection(id);
        server.status = isHealthy.success ? 'online' : 'offline';
        server.lastHeartbeat = new Date();
        if (isHealthy.success) {
          server.lastConnected = new Date().toISOString();
        }
      } catch (error) {
        server.status = 'error';
        console.error(`服务器 ${server.name} 健康检查失败:`, error);
      }
    }
    this.saveServers();
  }

  // 获取所有服务器
  getServers(): Server[] {
    return Array.from(this.servers.values()).map(({ connection, lastHeartbeat, ...server }) => server);
  }

  // 获取单个服务器
  getServer(id: string): Server | undefined {
    const server = this.servers.get(id);
    if (!server) return undefined;
    const { connection, lastHeartbeat, ...serverData } = server;
    return serverData;
  }

  // 创建新服务器
  createServer(request: CreateServerRequest): Server {
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    const server: ServerWithConnection = {
      id,
      name: request.name,
      host: request.host,
      port: request.port || 22,
      username: request.username,
      password: request.password,
      privateKey: request.privateKey,
      status: 'offline',
      createdAt: now,
      description: request.description,
      tags: request.tags || [],
      isLocal: false
    };

    this.servers.set(id, server);
    this.saveServers();
    
    // 立即测试连接
    this.testConnection(id).then(result => {
      server.status = result.success ? 'online' : 'error';
      if (result.success) {
        server.lastConnected = now;
      }
      this.saveServers();
    });

    return this.getServer(id)!;
  }

  // 更新服务器
  updateServer(id: string, updates: Partial<CreateServerRequest>): Server | null {
    const server = this.servers.get(id);
    if (!server || server.isLocal) {
      return null; // 不允许更新本地服务器
    }

    // 关闭现有连接
    if (server.connection) {
      server.connection.end();
      server.connection = undefined;
    }

    // 更新服务器信息
    Object.assign(server, updates);
    this.saveServers();

    // 重新测试连接
    this.testConnection(id);

    return this.getServer(id)!;
  }

  // 删除服务器
  deleteServer(id: string): boolean {
    const server = this.servers.get(id);
    if (!server || server.isLocal) {
      return false; // 不允许删除本地服务器
    }

    // 关闭连接
    if (server.connection) {
      server.connection.end();
    }

    this.servers.delete(id);
    this.saveServers();
    return true;
  }

  // 测试服务器连接
  async testConnection(id: string): Promise<ServerConnectionTest> {
    const server = this.servers.get(id);
    if (!server) {
      return { success: false, message: '服务器不存在' };
    }

    if (server.isLocal) {
      return { success: true, message: '本地服务器连接正常', latency: 0 };
    }

    if (!Client) {
      return { success: false, message: 'SSH客户端不可用' };
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      const conn = new Client();

      const timeout = setTimeout(() => {
        conn.end();
        resolve({ success: false, message: '连接超时' });
      }, 10000); // 10秒超时

      conn.on('ready', () => {
        clearTimeout(timeout);
        const latency = Date.now() - startTime;
        conn.end();
        resolve({ success: true, message: '连接成功', latency });
      });

      conn.on('error', (err: any) => {
        clearTimeout(timeout);
        resolve({ success: false, message: `连接失败: ${err.message}` });
      });

      try {
        const config: any = {
          host: server.host,
          port: server.port,
          username: server.username,
          readyTimeout: 10000
        };

        if (server.privateKey) {
          config.privateKey = server.privateKey;
        } else if (server.password) {
          config.password = server.password;
        }

        conn.connect(config);
      } catch (error) {
        clearTimeout(timeout);
        resolve({ success: false, message: `配置错误: ${error}` });
      }
    });
  }

  // 获取服务器统计信息
  async getServerStats(id: string): Promise<ServerStats | null> {
    const server = this.servers.get(id);
    if (!server) return null;

    if (server.isLocal) {
      // 本地服务器统计
      return this.getLocalStats();
    }

    // 远程服务器统计
    return this.getRemoteStats(id);
  }

  // 获取本地服务器统计
  private async getLocalStats(): Promise<ServerStats> {
    const os = require('os');
    
    return {
      cpuUsage: os.loadavg()[0],
      memoryUsage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
      uptime: os.uptime().toString(),
      loadAverage: os.loadavg()
    };
  }

  // 获取远程服务器统计
  private async getRemoteStats(id: string): Promise<ServerStats | null> {
    // 这里可以通过SSH执行命令获取远程服务器统计信息
    // 暂时返回null，后续可以扩展
    return null;
  }

  // 清理资源
  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const [id, server] of this.servers) {
      if (server.connection) {
        server.connection.end();
      }
    }
  }
}

// 单例模式
export const serverManager = new ServerManager();
