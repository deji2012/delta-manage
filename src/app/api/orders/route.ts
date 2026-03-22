import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Decimal } from 'decimal.js';

// --------------------------------------
// POST: 创建订单 (核心快照逻辑)
// --------------------------------------
const createOrderSchema = z.object({
  creatorId: z.string().min(1),     // 陪玩ID
  customerId: z.string().min(1),    // 客户ID
  categoryId: z.string().min(1),    // 品类ID
  auditorId: z.string().min(1),     // 指定审核员ID
  quantity: z.number().min(0.1),    // 数量/时长
  extraFee: z.number().default(0),  // 附加费
  proofImgs: z.array(z.string()).optional(), // 图片链接数组
  teammateIds: z.array(z.number()).optional(), // 队友ID数组
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. 校验参数
    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const { creatorId, customerId, categoryId, auditorId, quantity, extraFee, proofImgs } = validation.data;

    // 2. [关键] 获取品类快照信息 (Source: 108)
    // 必须从数据库查最新价格，不能信前端传的
    const category = await prisma.category.findUnique({
      where: { id: BigInt(categoryId) }
    });

    if (!category || category.isEnabled === 0) {
      return NextResponse.json({ error: "该品类不存在或已下架" }, { status: 400 });
    }

    // 3. [关键] 后端计算总价 (已替换为 Decimal) 🌟
    // 公式: (数量 * 单价快照) + 附加费
    // 保险起见，将数据库里的价格先 toString() 再喂给 Decimal，防止底层类型不兼容
    const unitPriceSnapshotDec = new Decimal(category.unitPrice.toString()); 
    const quantityDec = new Decimal(quantity);
    const extraFeeDec = new Decimal(extraFee);
    const totalPriceDec = quantityDec.times(unitPriceSnapshotDec).plus(extraFeeDec);
    // 转回普通数字用于落库
    const unitPriceSnapshot = unitPriceSnapshotDec.toNumber();
    const totalPrice = totalPriceDec.toNumber();
    // 4. 生成订单号 (例如: DO + 时间戳 + 随机数)
    const orderNo = `DO${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const { teammateIds } = body; // 接收前端传来的 teammateIds 数组
    // 5. 落库
    const newOrder = await prisma.order.create({
      data: {
        orderNo,
        creatorId: BigInt(creatorId),
        customerId: BigInt(customerId),
        auditorId: BigInt(auditorId),
        categoryId: BigInt(categoryId),

        // 快照字段
        categorySnapshotName: category.name,
        unitPriceSnapshot: unitPriceSnapshot,

        // 业务数据
        quantity,
        extraFee,
        totalPrice,
        proofImgs: JSON.stringify(proofImgs || []), // 转 JSON 字符串存

        teammates: teammateIds && teammateIds.length > 0 ? {
          connect: teammateIds.map((id: number) => ({ id })) // 关联队友
        } : undefined,
        
        status: 'audit', // 初始状态 (Source: 74)
      }
    });

    return NextResponse.json({ message: "报单成功", orderId: newOrder.id.toString() }, { status: 201 });

  } catch (error) {
    console.error("创建订单失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// --------------------------------------
// GET: 获取订单列表 (根据角色过滤)
// --------------------------------------
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId'); // 当前用户ID
    const role = searchParams.get('role');     // 当前用户角色

    if (!userId || !role) {
      return NextResponse.json({ error: "缺少用户信息" }, { status: 400 });
    }

    // 构建过滤条件 (Source: 52-60)
    let whereCondition: any = {};

    if (role === 'companion') {
      // 陪玩：只看自己建的
      whereCondition.creatorId = BigInt(userId);
    } else if (role === 'auditor') {
      // 审核员：只看指派给自己的
      whereCondition.auditorId = BigInt(userId);
    } else if (role === 'admin') {
      // 管理员：看所有 (不加限制)
    }

    const orders = await prisma.order.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } }, // 关联查客户名
        creator: { select: { nickname: true } }, // 关联查陪玩名
        auditor: { select: { nickname: true } }, // 关联查审核员名
      }
    });

    // 格式化数据
    const formatted = orders.map(o => ({
      ...o,
      id: o.id.toString(),
      creatorId: o.creatorId.toString(),
      auditorId: o.auditorId.toString(),
      customerId: o.customerId.toString(),
      categoryId: o.categoryId.toString(),
      // 价格转数字
      unitPriceSnapshot: Number(o.unitPriceSnapshot),
      totalPrice: Number(o.totalPrice),
      extraFee: Number(o.extraFee),
      quantity: Number(o.quantity),
      createdAt: o.createdAt.toISOString(),
    }));

    return NextResponse.json({ data: formatted });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "获取列表失败" }, { status: 500 });
  }
}