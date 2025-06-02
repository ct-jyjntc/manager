import { NextRequest, NextResponse } from 'next/server';
import { serverManager } from '@/lib/server-manager';
import { CreateServerRequest } from '@/types/process';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const server = serverManager.getServer(id);

    if (!server) {
      return NextResponse.json({ error: '服务器不存在' }, { status: 404 });
    }

    // 获取服务器统计信息
    const stats = await serverManager.getServerStats(id);
    return NextResponse.json({ ...server, stats });
  } catch (error) {
    return NextResponse.json({ error: '获取服务器信息失败' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const updates: Partial<CreateServerRequest> = await request.json();

    const server = serverManager.updateServer(id, updates);
    if (!server) {
      return NextResponse.json({ error: '服务器不存在或无法更新' }, { status: 404 });
    }

    return NextResponse.json(server);
  } catch (error) {
    return NextResponse.json({ error: '更新服务器失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const success = serverManager.deleteServer(id);

    if (!success) {
      return NextResponse.json({ error: '服务器不存在或无法删除' }, { status: 404 });
    }

    return NextResponse.json({ message: '服务器已删除' });
  } catch (error) {
    return NextResponse.json({ error: '删除服务器失败' }, { status: 500 });
  }
}
