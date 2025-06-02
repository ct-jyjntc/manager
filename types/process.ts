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
}

export interface ProcessAction {
  type: 'start' | 'stop' | 'restart' | 'delete';
  processId: string;
}