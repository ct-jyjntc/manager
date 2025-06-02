import { NextRequest, NextResponse } from 'next/server';
import { multiServerProcessManager } from '@/lib/multi-server-process-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const process = await multiServerProcessManager.getProcess(id);

    if (!process) {
      return NextResponse.json({ error: '进程不存在' }, { status: 404 });
    }

    return NextResponse.json(process);
  } catch (error) {
    return NextResponse.json({ error: '获取进程信息失败' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { action } = await request.json();

    let success = false;
    switch (action) {
      case 'start':
        success = await multiServerProcessManager.startProcess(id);
        break;
      case 'stop':
        success = await multiServerProcessManager.stopProcess(id);
        break;
      case 'restart':
        success = await multiServerProcessManager.restartProcess(id);
        break;
      default:
        return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }

    if (!success) {
      return NextResponse.json({ error: '操作失败' }, { status: 400 });
    }

    const process = await multiServerProcessManager.getProcess(id);
    return NextResponse.json(process);
  } catch (error) {
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const success = await multiServerProcessManager.deleteProcess(id);

    if (!success) {
      return NextResponse.json({ error: '进程不存在' }, { status: 404 });
    }

    return NextResponse.json({ message: '进程已删除' });
  } catch (error) {
    return NextResponse.json({ error: '删除进程失败' }, { status: 500 });
  }
}