// src/app/api/admin/users/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// --------------------------------------
// GET: 获取用户列表 (默认只查待审核)
// --------------------------------------
export async function GET(request: Request) {
  try {
    // 获取 URL 查询参数
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    
    // 默认为 0 (待审核)，除非显式传了其他值
    const statusFilter = statusParam ? parseInt(statusParam) : 0;

    const users = await prisma.user.findMany({
      where: {
        status: statusFilter,
      },
      orderBy: {
        createdAt: 'desc', // 新申请的排前面
      },
      // 只选择需要的字段
      select: {
        id: true,
        username: true,
        nickname: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    // 处理 BigInt 问题：将 id 转换为字符串
    const formattedUsers = users.map(user => ({
      ...user,
      id: user.id.toString(),
      createdAt: user.createdAt.toISOString(),
    }));

    return NextResponse.json({ data: formattedUsers }, { status: 200 });

  } catch (error) {
    console.error("获取用户列表失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// --------------------------------------
// PATCH: 审核用户 (通过/驳回)
// --------------------------------------

// 定义审核动作的校验规则
const auditSchema = z.object({
  userId: z.string().min(1, "用户ID不能为空"),
  action: z.enum(['approve', 'reject'], { 
    message: "操作类型必须是 approve 或 reject" 
  }), 
});

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    // 1. 校验请求数据
    const validation = auditSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { userId, action } = validation.data;

    // 2. 确定目标状态
    // approve -> 1 (正常)
    // reject  -> 3 (驳回)
    const newStatus = action === 'approve' ? 1 : 3;

    // 3. 执行更新
    const updatedUser = await prisma.user.update({
      where: { id: BigInt(userId) },
      data: { status: newStatus },
    });

    return NextResponse.json({
      message: action === 'approve' ? "审核通过" : "已驳回",
      userId: updatedUser.id.toString(),
      status: updatedUser.status
    });

  } catch (error) {
    console.error("审核操作失败:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}