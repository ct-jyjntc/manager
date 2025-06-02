import { NextRequest, NextResponse } from 'next/server';
import { CreateServerRequest } from '@/types/process';
import { serverManager } from '@/lib/server-manager';

export async function GET() {
  try {
    const servers = serverManager.getServers();
    return NextResponse.json(servers);
  } catch (error) {
    return NextResponse.json({ error: '获取服务器列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateServerRequest = await request.json();
    const { name, host, port, username, password, privateKey, description, tags } = body;

    if (!name || !host || !username) {
      return NextResponse.json({ error: '服务器名称、主机地址和用户名不能为空' }, { status: 400 });
    }

    const server = serverManager.createServer({
      name,
      host,
      port: port || 22,
      username,
      password,
      privateKey,
      description,
      tags
    });

    return NextResponse.json(server, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '创建服务器失败' }, { status: 500 });
  }
}
