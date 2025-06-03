import { NextRequest, NextResponse } from 'next/server';
import { realProcessManager } from '@/lib/real-process-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const process = realProcessManager.getProcess(id);

    if (!process) {
      return NextResponse.json({ error: '进程不存在' }, { status: 404 });
    }

    // 获取额外的进程统计信息
    const stats = await realProcessManager.getProcessStats(id);
    return NextResponse.json({ ...process, stats });
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
        success = await realProcessManager.startProcess(id);
        break;
      case 'stop':
        success = realProcessManager.stopProcess(id);
        break;
      default:
        return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }

    if (!success) {
      return NextResponse.json({ error: '操作失败' }, { status: 400 });
    }

    const process = realProcessManager.getProcess(id);
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
    const success = realProcessManager.deleteProcess(id);

    if (!success) {
      return NextResponse.json({ error: '进程不存在' }, { status: 404 });
    }

    return NextResponse.json({ message: '进程已删除' });
  } catch (error) {
    return NextResponse.json({ error: '删除进程失败' }, { status: 500 });
  }
}