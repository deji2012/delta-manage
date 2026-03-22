import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: 模糊搜索陪玩队友
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';

  try {
    const users = await prisma.user.findMany({
      where: {
        role: 'companion', // 只能搜到陪玩
        status: 1,         // 必须是正常状态
        nickname: { contains: keyword } // 模糊匹配昵称
      },
      select: { id: true, nickname: true, username: true },
      take: 10 // 最多返回 10 个避免数据过大
    });
    return NextResponse.json({ data: users });
  } catch (error) {
    return NextResponse.json({ error: "搜索失败" }, { status: 500 });
  }
}