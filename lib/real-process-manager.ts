import { spawn, ChildProcess, exec } from 'child_process';
import { Process } from '@/types/process';
import fs from 'fs';
import path from 'path';

interface ProcessWithChild extends Process {
  childProcess?: ChildProcess;
}

// 真实进程管理器 - 适用于 Debian/Linux 系统
class RealProcessManager {
  private processes: Map<string, ProcessWithChild> = new Map();
  private dataFile = path.join(process.cwd(), 'processes.json');

  constructor() {
    this.loadProcesses();
  }

  // 从文件加载进程数据
  private loadProcesses() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = fs.readFileSync(this.dataFile, 'utf-8');
        const processData = JSON.parse(data);
        for (const [id, process] of Object.entries(processData)) {
          this.processes.set(id, process as ProcessWithChild);
        }
      }
    } catch (error) {
      console.error('加载进程数据失败:', error);
    }
  }

  // 保存进程数据到文件
  private saveProcesses() {
    try {
      const processData: Record<string, Process> = {};
      for (const [id, process] of this.processes) {
        // 不保存 childProcess 对象
        const { childProcess, ...processData_ } = process;
        processData[id] = processData_;
      }
      fs.writeFileSync(this.dataFile, JSON.stringify(processData, null, 2));
    } catch (error) {
      console.error('保存进程数据失败:', error);
    }
  }

  getProcesses(): Process[] {
    const processes = Array.from(this.processes.values()).map(({ childProcess, ...process }) => process);
    return processes;
  }

  getProcess(id: string): Process | undefined {
    const process = this.processes.get(id);
    if (!process) return undefined;
    const { childProcess, ...processData } = process;
    return processData;
  }

  createProcess(name: string, command: string, autoRestart: boolean = false, cwd?: string): Process {
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    const process: ProcessWithChild = {
      id,
      name,
      command,
      status: 'stopped',
      createdAt: now,
      restartCount: 0,
      autoRestart,
      cwd: cwd || '/root',
      logs: [`${now}: 进程已创建`]
    };

    this.processes.set(id, process);
    this.saveProcesses();
    return this.getProcess(id)!;
  }

  async startProcess(id: string): Promise<boolean> {
    const process = this.processes.get(id);
    if (!process || process.status === 'running') {
      return false;
    }

    const now = new Date().toISOString();

    try {
      // 解析命令和参数
      const parts = process.command.trim().split(/\s+/);
      const command = parts[0];
      const args = parts.slice(1);

      // 启动子进程
      const childProcess = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
        detached: false,
        cwd: process.cwd || '/root'
      });

      process.childProcess = childProcess;
      process.pid = childProcess.pid;
      process.status = 'running';
      process.lastStarted = now;
      process.logs.push(`${now}: 进程已启动 (PID: ${childProcess.pid})`);

      // 监听标准输出
      childProcess.stdout?.on('data', (data) => {
        const timestamp = new Date().toISOString();
        const output = data.toString().trim();
        if (output) {
          process.logs.push(`${timestamp}: [STDOUT] ${output}`);
          this.saveProcesses();
        }
      });

      // 监听标准错误
      childProcess.stderr?.on('data', (data) => {
        const timestamp = new Date().toISOString();
        const output = data.toString().trim();
        if (output) {
          process.logs.push(`${timestamp}: [STDERR] ${output}`);
          this.saveProcesses();
        }
      });

      // 监听进程退出
      childProcess.on('exit', (code, signal) => {
        const timestamp = new Date().toISOString();
        process.status = code === 0 ? 'stopped' : 'error';
        process.pid = undefined;
        process.childProcess = undefined;
        
        if (signal) {
          process.logs.push(`${timestamp}: 进程被信号终止: ${signal}`);
        } else {
          process.logs.push(`${timestamp}: 进程退出，退出码: ${code}`);
        }

        this.saveProcesses();

        // 自动重启逻辑
        if (process.autoRestart && code !== 0) {
          process.logs.push(`${timestamp}: 检测到异常退出，将在2秒后自动重启...`);
          setTimeout(() => {
            this.restartProcess(id);
          }, 2000);
        }
      });

      // 监听错误
      childProcess.on('error', (error) => {
        const timestamp = new Date().toISOString();
        process.status = 'error';
        process.logs.push(`${timestamp}: 进程启动失败: ${error.message}`);
        this.saveProcesses();
      });

      this.saveProcesses();
      return true;

    } catch (error) {
      process.status = 'error';
      process.logs.push(`${now}: 启动失败: ${error}`);
      this.saveProcesses();
      return false;
    }
  }

  stopProcess(id: string): boolean {
    const process = this.processes.get(id);
    if (!process || process.status !== 'running' || !process.childProcess) {
      return false;
    }

    const now = new Date().toISOString();

    try {
      // 优雅地终止进程
      process.childProcess.kill('SIGTERM');
      
      // 如果3秒后进程还没有退出，强制杀死
      setTimeout(() => {
        if (process.childProcess && !process.childProcess.killed) {
          process.childProcess.kill('SIGKILL');
          process.logs.push(`${new Date().toISOString()}: 强制终止进程`);
        }
      }, 3000);

      process.logs.push(`${now}: 发送终止信号`);
      this.saveProcesses();
      return true;

    } catch (error) {
      process.logs.push(`${now}: 停止进程失败: ${error}`);
      this.saveProcesses();
      return false;
    }
  }

  async restartProcess(id: string): Promise<boolean> {
    const process = this.processes.get(id);
    if (!process) {
      return false;
    }

    const now = new Date().toISOString();
    process.logs.push(`${now}: 开始重启进程...`);
    process.restartCount++;

    // 如果进程正在运行，先停止它
    if (process.status === 'running') {
      this.stopProcess(id);
      
      // 等待进程完全停止
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 重新启动进程
    return this.startProcess(id);
  }

  deleteProcess(id: string): boolean {
    const process = this.processes.get(id);
    if (!process) {
      return false;
    }

    // 如果进程正在运行，先停止它
    if (process.status === 'running') {
      this.stopProcess(id);
    }

    this.processes.delete(id);
    this.saveProcesses();
    return true;
  }

  // 检查进程是否真的在运行
  async checkProcessStatus(id: string): Promise<boolean> {
    const process = this.processes.get(id);
    if (!process || !process.pid) {
      return false;
    }

    return new Promise((resolve) => {
      exec(`ps -p ${process.pid}`, (error) => {
        resolve(!error);
      });
    });
  }

  // 获取进程统计信息
  async getProcessStats(id: string): Promise<{ cpuUsage?: number; memoryUsage?: number; uptime?: string } | null> {
    const process = this.processes.get(id);
    if (!process || !process.pid) {
      return null;
    }

    return new Promise((resolve) => {
      exec(`ps -p ${process.pid} -o pid,pcpu,pmem,etime --no-headers`, (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }

        const parts = stdout.trim().split(/\s+/);
        if (parts.length >= 4) {
          resolve({
            cpuUsage: parseFloat(parts[1]),
            memoryUsage: parseFloat(parts[2]),
            uptime: parts[3] // uptime 保持为字符串格式（如 "02:30:15"）
          });
        } else {
          resolve(null);
        }
      });
    });
  }
}

// 单例模式
export const realProcessManager = new RealProcessManager();