import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// 定义符合 Next.js 15 的参数类型 (Promise)
type RouteParams = {
  params: Promise<{ id: string }>;
};

// --------------------------------------
// GET: 获取单条订单详情
// --------------------------------------
export async function GET(request: Request, { params }: RouteParams) {
  try {
    // 🔴 关键修复：先 await params，再解构 id
    const { id } = await params;
    const orderId = BigInt(id);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { name: true } },
        creator: { select: { nickname: true, username: true } },
        auditor: { select: { nickname: true } },
        teammates: { select: { id: true, nickname: true } } 
      }
    });

    if (!order) {
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }

    // 格式化数据
    const formatted = {
      ...order,
      id: order.id.toString(),
      creatorId: order.creatorId.toString(),
      auditorId: order.auditorId.toString(),
      customerId: order.customerId.toString(),
      categoryId: order.categoryId.toString(),
      unitPriceSnapshot: Number(order.unitPriceSnapshot),
      totalPrice: Number(order.totalPrice),
      extraFee: Number(order.extraFee),
      quantity: Number(order.quantity),
      createdAt: order.createdAt.toISOString(),
      proofImgs: order.proofImgs ? JSON.parse(order.proofImgs) : [],
    };

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error("API GET Error:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// --------------------------------------
// PATCH: 处理审核动作 (通过/驳回/撤回)
// --------------------------------------
const actionSchema = z.object({
  action: z.enum(['approve', 'reject', 'withdraw']),
  reason: z.string().optional(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const body = await request.json();
    const { action, reason } = actionSchema.parse(body);
    
    // 🔴 关键修复：同样要 await params
    const { id } = await params;
    const orderId = BigInt(id);

    // 1. 获取当前订单状态
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });

    // 2. 状态机守卫
    if (order.status !== 'audit') {
      return NextResponse.json({ error: "当前状态不允许此操作" }, { status: 400 });
    }

    let updateData: any = {};

    // 3. 执行动作逻辑
    if (action === 'approve') {
      updateData = { status: 'completed' };
    } else if (action === 'reject') {
      if (!reason) return NextResponse.json({ error: "驳回必须填写原因" }, { status: 400 });
      updateData = { 
        status: 'rejected', 
        rejectReason: reason 
      };
    } else if (action === 'withdraw') {
      updateData = { status: 'withdrawn' };
    }

    // 4. 更新数据库
    await prisma.order.update({
      where: { id: orderId },
      data: updateData
    });

    return NextResponse.json({ message: "操作成功" });

  } catch (error) {
    console.error("API PATCH Error:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}