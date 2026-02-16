import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取所有角色为 'auditor' 或 'admin' 的用户（因为管理员也能审核）
export async function GET() {
  try {
    const auditors = await prisma.user.findMany({
      where: {
        role: { in: ['auditor', 'admin'] }, // 允许选管理员或审核员
        status: 1, // 必须是正常状态
      },
      select: {
        id: true,
        nickname: true,
        username: true,
      }
    });
    
    // BigInt 转 string
    const data = auditors.map(u => ({
      ...u,
      id: u.id.toString()
    }));

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "获取审核员失败" }, { status: 500 });
  }
}