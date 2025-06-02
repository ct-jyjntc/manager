import { Process, CreateProcessRequest } from '@/types/process';
import { realProcessManager } from './real-process-manager';
import { serverManager } from './server-manager';
import fs from 'fs';
import path from 'path';

// 动态导入SSH2以避免构建问题
let Client: any = null;
try {
  if (typeof window === 'undefined') {
    const ssh2 = require('ssh2');
    Client = ssh2.Client;
  }
} catch (error) {
  console.warn('SSH2 not available:', error);
}

interface ProcessWithServer extends Process {
  serverName?: string;
}

interface RemoteProcessInfo {
  id: string;
  serverId: string;
  remotePid?: number;
  connection?: any;
}

// 多服务器进程管理器
class MultiServerProcessManager {
  private remoteProcesses: Map<string, RemoteProcessInfo> = new Map();
  private connections: Map<string, any> = new Map();
  private dataFile = path.join(process.cwd(), 'multi-server-processes.json');

  constructor() {
    this.loadRemoteProcesses();
  }

  // 从文件加载远程进程数据
  private loadRemoteProcesses() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = fs.readFileSync(this.dataFile, 'utf-8');
        const processData = JSON.parse(data);
        for (const [id, process] of Object.entries(processData)) {
          this.remoteProcesses.set(id, process as RemoteProcessInfo);
        }
      }
    } catch (error) {
      console.error('加载远程进程数据失败:', error);
    }
  }

  // 保存远程进程数据到文件
  private saveRemoteProcesses() {
    try {
      const processData: Record<string, any> = {};
      for (const [id, process] of this.remoteProcesses) {
        // 不保存连接对象
        const { connection, ...processData_ } = process;
        processData[id] = processData_;
      }
      fs.writeFileSync(this.dataFile, JSON.stringify(processData, null, 2));
    } catch (error) {
      console.error('保存远程进程数据失败:', error);
    }
  }

  // 获取SSH连接
  private async getConnection(serverId: string): Promise<any | null> {
    if (serverId === 'local') {
      return null; // 本地服务器不需要SSH连接
    }

    if (!Client) {
      throw new Error('SSH客户端不可用');
    }

    // 检查是否已有活跃连接
    const existingConnection = this.connections.get(serverId);
    if (existingConnection && existingConnection.readable) {
      return existingConnection;
    }

    const server = serverManager.getServer(serverId);
    if (!server) {
      throw new Error(`服务器 ${serverId} 不存在`);
    }

    return new Promise((resolve, reject) => {
      const conn = new Client();
      
      conn.on('ready', () => {
        this.connections.set(serverId, conn);
        resolve(conn);
      });

      conn.on('error', (err: any) => {
        reject(new Error(`连接服务器失败: ${err.message}`));
      });

      conn.on('close', () => {
        this.connections.delete(serverId);
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
        reject(new Error(`SSH配置错误: ${error}`));
      }
    });
  }

  // 在远程服务器执行命令
  private async executeRemoteCommand(serverId: string, command: string): Promise<{ stdout: string; stderr: string; code: number }> {
    const connection = await this.getConnection(serverId);
    if (!connection) {
      throw new Error('无法建立SSH连接');
    }

    return new Promise((resolve, reject) => {
      connection.exec(command, (err: any, stream: any) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code: number) => {
          resolve({ stdout, stderr, code });
        });

        stream.on('data', (data: any) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: any) => {
          stderr += data.toString();
        });
      });
    });
  }

  // 获取所有进程（本地 + 远程）
  async getProcesses(): Promise<ProcessWithServer[]> {
    const processes: ProcessWithServer[] = [];

    // 获取本地进程
    const localProcesses = realProcessManager.getProcesses();
    for (const process of localProcesses) {
      processes.push({
        ...process,
        serverId: process.serverId || 'local',
        serverName: '本地服务器'
      });
    }

    // 获取远程进程
    const servers = serverManager.getServers();
    for (const server of servers) {
      if (server.isLocal) continue;

      try {
        const remoteProcesses = await this.getRemoteProcesses(server.id);
        for (const process of remoteProcesses) {
          processes.push({
            ...process,
            serverName: server.name
          });
        }
      } catch (error) {
        console.error(`获取服务器 ${server.name} 的进程失败:`, error);
      }
    }

    return processes;
  }

  // 获取远程服务器的进程
  private async getRemoteProcesses(serverId: string): Promise<Process[]> {
    // 这里可以通过SSH连接获取远程进程信息
    // 暂时返回空数组，后续可以扩展
    return [];
  }

  // 获取单个进程
  async getProcess(id: string): Promise<ProcessWithServer | undefined> {
    // 首先尝试从本地获取
    const localProcess = realProcessManager.getProcess(id);
    if (localProcess) {
      return {
        ...localProcess,
        serverId: localProcess.serverId || 'local',
        serverName: '本地服务器'
      };
    }

    // 然后尝试从远程获取
    const remoteInfo = this.remoteProcesses.get(id);
    if (remoteInfo) {
      const server = serverManager.getServer(remoteInfo.serverId);
      if (server) {
        // 这里可以通过SSH获取远程进程详细信息
        // 暂时返回基本信息
        return {
          id,
          name: `远程进程-${id}`,
          command: 'unknown',
          status: 'stopped',
          createdAt: new Date().toISOString(),
          restartCount: 0,
          autoRestart: false,
          logs: [],
          serverId: remoteInfo.serverId,
          serverName: server.name
        };
      }
    }

    return undefined;
  }

  // 创建进程
  async createProcess(request: CreateProcessRequest): Promise<Process> {
    const { serverId, ...processRequest } = request;

    if (serverId === 'local') {
      // 在本地服务器创建进程
      const process = realProcessManager.createProcess(
        processRequest.name,
        processRequest.command,
        processRequest.autoRestart,
        processRequest.cwd
      );
      return {
        ...process,
        serverId: 'local'
      };
    } else {
      // 在远程服务器创建进程
      return this.createRemoteProcess(serverId, processRequest);
    }
  }

  // 在远程服务器创建进程
  private async createRemoteProcess(serverId: string, request: Omit<CreateProcessRequest, 'serverId'>): Promise<Process> {
    const server = serverManager.getServer(serverId);
    if (!server) {
      throw new Error(`服务器 ${serverId} 不存在`);
    }

    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    // 创建远程进程记录
    const remoteInfo: RemoteProcessInfo = {
      id,
      serverId
    };

    this.remoteProcesses.set(id, remoteInfo);
    this.saveRemoteProcesses();

    // 返回进程信息
    const process: Process = {
      id,
      name: request.name,
      command: request.command,
      status: 'stopped',
      createdAt: now,
      restartCount: 0,
      autoRestart: request.autoRestart || false,
      logs: [`${now}: 远程进程已创建`],
      cwd: request.cwd,
      serverId
    };

    return process;
  }

  // 启动进程
  async startProcess(id: string): Promise<boolean> {
    const process = await this.getProcess(id);
    if (!process) return false;

    if (process.serverId === 'local') {
      return realProcessManager.startProcess(id);
    } else {
      return this.startRemoteProcess(id);
    }
  }

  // 启动远程进程
  private async startRemoteProcess(id: string): Promise<boolean> {
    const remoteInfo = this.remoteProcesses.get(id);
    if (!remoteInfo) return false;

    try {
      // 这里可以通过SSH启动远程进程
      // 暂时返回true，后续可以扩展
      console.log(`启动远程进程 ${id} 在服务器 ${remoteInfo.serverId}`);
      return true;
    } catch (error) {
      console.error(`启动远程进程失败:`, error);
      return false;
    }
  }

  // 停止进程
  async stopProcess(id: string): Promise<boolean> {
    const process = await this.getProcess(id);
    if (!process) return false;

    if (process.serverId === 'local') {
      return realProcessManager.stopProcess(id);
    } else {
      return this.stopRemoteProcess(id);
    }
  }

  // 停止远程进程
  private async stopRemoteProcess(id: string): Promise<boolean> {
    const remoteInfo = this.remoteProcesses.get(id);
    if (!remoteInfo) return false;

    try {
      // 这里可以通过SSH停止远程进程
      // 暂时返回true，后续可以扩展
      console.log(`停止远程进程 ${id} 在服务器 ${remoteInfo.serverId}`);
      return true;
    } catch (error) {
      console.error(`停止远程进程失败:`, error);
      return false;
    }
  }

  // 重启进程
  async restartProcess(id: string): Promise<boolean> {
    const process = await this.getProcess(id);
    if (!process) return false;

    if (process.serverId === 'local') {
      return realProcessManager.restartProcess(id);
    } else {
      // 远程进程重启
      await this.stopRemoteProcess(id);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.startRemoteProcess(id);
    }
  }

  // 删除进程
  async deleteProcess(id: string): Promise<boolean> {
    const process = await this.getProcess(id);
    if (!process) return false;

    if (process.serverId === 'local') {
      return realProcessManager.deleteProcess(id);
    } else {
      // 删除远程进程
      await this.stopRemoteProcess(id);
      this.remoteProcesses.delete(id);
      this.saveRemoteProcesses();
      return true;
    }
  }

  // 清理资源
  destroy() {
    for (const [serverId, connection] of this.connections) {
      connection.end();
    }
    this.connections.clear();
  }
}

// 单例模式
export const multiServerProcessManager = new MultiServerProcessManager();
