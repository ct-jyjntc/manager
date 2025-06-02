import { NextRequest, NextResponse } from 'next/server';
import { CreateProcessRequest } from '@/types/process';
import { realProcessManager } from '@/lib/real-process-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    const processes = realProcessManager.getProcesses();

    // 如果请求导出格式，返回导出数据
    if (format === 'export') {
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
    }

    // 默认返回完整的进程列表
    return NextResponse.json(processes);
  } catch (error) {
    return NextResponse.json({ error: '获取进程列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateProcessRequest = await request.json();
    const { name, command, autoRestart = false, cwd } = body;

    if (!name || !command) {
      return NextResponse.json({ error: '进程名称和命令不能为空' }, { status: 400 });
    }

    const process = realProcessManager.createProcess(name, command, autoRestart, cwd);
    return NextResponse.json(process, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '创建进程失败' }, { status: 500 });
  }
}