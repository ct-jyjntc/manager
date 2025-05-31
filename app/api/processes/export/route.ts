import { NextResponse } from 'next/server';
import { realProcessManager } from '@/lib/real-process-manager';

export async function GET() {
  try {
    const processes = realProcessManager.getProcesses();
    
    // 导出配置数据，不包含运行时状态和日志
    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      processes: processes.map(process => ({
        name: process.name,
        command: process.command,
        autoRestart: process.autoRestart,
        cwd: process.cwd
      }))
    };

    return NextResponse.json(exportData);
  } catch (error) {
    return NextResponse.json({ error: '导出配置失败' }, { status: 500 });
  }
}
