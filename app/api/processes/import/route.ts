import { NextRequest, NextResponse } from 'next/server';
import { realProcessManager } from '@/lib/real-process-manager';

interface ImportProcess {
  name: string;
  command: string;
  autoRestart?: boolean;
  cwd?: string;
}

interface ImportData {
  version: string;
  exportTime: string;
  processes: ImportProcess[];
}

export async function POST(request: NextRequest) {
  try {
    const importData: ImportData = await request.json();

    if (!importData.processes || !Array.isArray(importData.processes)) {
      return NextResponse.json({ error: '无效的配置文件格式' }, { status: 400 });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    };

    // 获取现有进程名称列表，避免重复导入
    const existingProcesses = realProcessManager.getProcesses();
    const existingNames = new Set(existingProcesses.map(p => p.name));

    for (const processConfig of importData.processes) {
      try {
        if (!processConfig.name || !processConfig.command) {
          results.errors.push(`进程配置无效: 缺少名称或命令`);
          continue;
        }

        if (existingNames.has(processConfig.name)) {
          results.skipped++;
          continue;
        }

        realProcessManager.createProcess(
          processConfig.name,
          processConfig.command,
          processConfig.autoRestart || false,
          processConfig.cwd
        );

        results.imported++;
      } catch (error) {
        results.errors.push(`导入进程 "${processConfig.name}" 失败: ${error}`);
      }
    }

    return NextResponse.json({
      message: '配置导入完成',
      results
    });
  } catch (error) {
    return NextResponse.json({ error: '导入配置失败' }, { status: 500 });
  }
}
