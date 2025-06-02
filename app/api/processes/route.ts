import { NextRequest, NextResponse } from 'next/server';
import { CreateProcessRequest } from '@/types/process';
import { multiServerProcessManager } from '@/lib/multi-server-process-manager';

export async function GET() {
  try {
    const processes = await multiServerProcessManager.getProcesses();
    return NextResponse.json(processes);
  } catch (error) {
    return NextResponse.json({ error: '获取进程列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateProcessRequest = await request.json();
    const { name, command, autoRestart = false, cwd, serverId } = body;

    if (!name || !command || !serverId) {
      return NextResponse.json({ error: '进程名称、命令和服务器ID不能为空' }, { status: 400 });
    }

    const process = await multiServerProcessManager.createProcess({
      name,
      command,
      autoRestart,
      cwd,
      serverId
    });
    return NextResponse.json(process, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '创建进程失败' }, { status: 500 });
  }
}