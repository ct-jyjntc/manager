import { NextRequest, NextResponse } from 'next/server';
import { realProcessManager } from '@/lib/real-process-manager';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const process = realProcessManager.getProcess(id);

    if (!process) {
      return NextResponse.json({ error: '进程不存在' }, { status: 404 });
    }

    // 清除进程日志
    const success = realProcessManager.clearProcessLogs(id);

    if (!success) {
      return NextResponse.json({ error: '清除日志失败' }, { status: 400 });
    }

    return NextResponse.json({ message: '日志已清除' });
  } catch (error) {
    return NextResponse.json({ error: '清除日志失败' }, { status: 500 });
  }
}
