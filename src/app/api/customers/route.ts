import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// --------------------------------------
// GET: 获取客户列表 (支持模糊搜索)
// --------------------------------------
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name') || ''; // 获取搜索关键词

    const customers = await prisma.customer.findMany({
      where: {
        name: {
          contains: name, // 模糊搜索 [cite: 16]
        },
      },
      orderBy: {
        id: 'desc', // 新加的排前面
      },
      include: {
        creator: { // 关联查询创建人信息
          select: { nickname: true },
        },
      },
    });

    // 处理 BigInt 问题
    const formattedCustomers = customers.map(customer => ({
      ...customer,
      id: customer.id.toString(),
      creatorId: customer.creatorId.toString(),
    }));

    return NextResponse.json({ data: formattedCustomers });
  } catch (error) {
    console.error("获取客户列表失败:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// --------------------------------------
// POST: 创建新客户 (Admin Only)
// --------------------------------------

// 校验规则 [cite: 39, 40]
const createCustomerSchema = z.object({
  name: z.string().min(1, "客户名称不能为空").max(50, "最长50字符"),
  remark: z.string().max(200, "备注最长200字符").optional(),
  creatorId: z.string().min(1, "创建人ID缺失"), // 前端传过来
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validation = createCustomerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, remark, creatorId } = validation.data;

    const newCustomer = await prisma.customer.create({
      data: {
        name,
        remark,
        creatorId: BigInt(creatorId), // 关联当前登录的管理员
      },
    });

    return NextResponse.json({
      message: "客户添加成功",
      customer: {
        id: newCustomer.id.toString(),
        name: newCustomer.name,
      }
    }, { status: 201 });

  } catch (error) {
    console.error("创建客户失败:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}