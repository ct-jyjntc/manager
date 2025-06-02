import { NextRequest, NextResponse } from 'next/server';
import { serverManager } from '@/lib/server-manager';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const result = await serverManager.testConnection(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: `测试连接失败: ${error}` 
    }, { status: 500 });
  }
}
