import { Process } from '@/types/process';

// 模拟进程管理器（在实际生产环境中，这应该是一个后端服务）
class ProcessManager {
  private processes: Map<string, Process> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  getProcesses(): Process[] {
    return Array.from(this.processes.values());
  }

  getProcess(id: string): Process | undefined {
    return this.processes.get(id);
  }

  createProcess(name: string, command: string, autoRestart: boolean = false): Process {
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    const process: Process = {
      id,
      name,
      command,
      status: 'stopped',
      createdAt: now,
      restartCount: 0,
      autoRestart,
      logs: [`${now}: 进程已创建`]
    };

    this.processes.set(id, process);
    return process;
  }

  startProcess(id: string): boolean {
    const process = this.processes.get(id);
    if (!process || process.status === 'running') {
      return false;
    }

    const now = new Date().toISOString();
    process.status = 'running';
    process.lastStarted = now;
    process.pid = Math.floor(Math.random() * 65535) + 1000; // 模拟PID
    process.logs.push(`${now}: 进程已启动 (模拟PID: ${process.pid})`);

    // 模拟进程运行（每30秒添加一条日志）
    const interval = setInterval(() => {
      if (process.status === 'running') {
        const timestamp = new Date().toISOString();
        process.logs.push(`${timestamp}: [INFO] 进程正在运行...`);
        
        // 模拟偶尔的错误（5%概率）
        if (Math.random() < 0.05) {
          process.status = 'error';
          process.logs.push(`${timestamp}: [ERROR] 进程遇到错误`);
          this.clearInterval(id);
          
          if (process.autoRestart) {
            setTimeout(() => {
              this.restartProcess(id);
            }, 2000);
          }
        }
      }
    }, 30000);

    this.intervals.set(id, interval);
    return true;
  }

  stopProcess(id: string): boolean {
    const process = this.processes.get(id);
    if (!process || process.status !== 'running') {
      return false;
    }

    const now = new Date().toISOString();
    process.status = 'stopped';
    process.logs.push(`${now}: 进程已停止`);
    
    this.clearInterval(id);
    return true;
  }

  restartProcess(id: string): boolean {
    const process = this.processes.get(id);
    if (!process) {
      return false;
    }

    this.stopProcess(id);
    process.restartCount++;
    
    setTimeout(() => {
      const now = new Date().toISOString();
      process.logs.push(`${now}: 进程重启中...`);
      this.startProcess(id);
    }, 1000);

    return true;
  }

  deleteProcess(id: string): boolean {
    const process = this.processes.get(id);
    if (!process) {
      return false;
    }

    this.stopProcess(id);
    this.processes.delete(id);
    return true;
  }

  private clearInterval(id: string) {
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
    }
  }
}

// 单例模式
export const processManager = new ProcessManager();