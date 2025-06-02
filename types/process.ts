// 服务器相关类型定义
export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  status: 'online' | 'offline' | 'connecting' | 'error';
  lastConnected?: string;
  createdAt: string;
  description?: string;
  tags?: string[];
  isLocal?: boolean; // 标识是否为本地服务器
}

export interface ServerStats {
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  uptime?: string;
  processCount?: number;
  loadAverage?: number[];
}

export interface Process {
  id: string;
  name: string;
  command: string;
  status: 'running' | 'stopped' | 'error';
  pid?: number;
  createdAt: string;
  lastStarted?: string;
  restartCount: number;
  autoRestart: boolean;
  logs: string[];
  cwd?: string;
  serverId: string; // 关联的服务器ID
  serverName?: string; // 服务器名称（用于显示）
}

export interface ProcessStats {
  cpuUsage?: number;
  memoryUsage?: number;
  uptime?: string | number;
}

export interface CreateProcessRequest {
  name: string;
  command: string;
  autoRestart?: boolean;
  cwd?: string;
  serverId: string; // 指定在哪个服务器上创建进程
}

export interface ProcessAction {
  type: 'start' | 'stop' | 'restart' | 'delete';
  processId: string;
}

export interface CreateServerRequest {
  name: string;
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
  description?: string;
  tags?: string[];
}

export interface ServerConnectionTest {
  success: boolean;
  message: string;
  latency?: number;
}