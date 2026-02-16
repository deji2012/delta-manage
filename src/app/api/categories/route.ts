import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// --------------------------------------
// GET: 获取品类列表
// --------------------------------------
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('isEnabled'); // 允许前端只查“上架中”的

    const whereCondition = statusParam ? { isEnabled: parseInt(statusParam) } : {};

    const categories = await prisma.category.findMany({
      where: whereCondition,
      orderBy: { id: 'desc' },
    });

    // 处理 BigInt 和 Decimal
    const formatted = categories.map(c => ({
      ...c,
      id: c.id.toString(),
      // Decimal 转数字或字符串给前端
      unitPrice: c.unitPrice.toNumber(), 
    }));

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error("获取品类失败:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// --------------------------------------
// POST: 新增品类 (Admin Only)
// --------------------------------------
const createSchema = z.object({
  name: z.string().min(1, "名称必填"),
  unitPrice: z.number().min(0, "单价不能为负"),
  unitMeasure: z.string().default("小时"), // 默认为“小时” [cite: 95]
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const validation = createSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { name, unitPrice, unitMeasure } = validation.data;

    const newCategory = await prisma.category.create({
      data: {
        name,
        unitPrice, // Prisma 会自动处理 number -> Decimal
        unitMeasure,
        isEnabled: 1, // 默认启用 [cite: 95]
      },
    });

    return NextResponse.json({ 
      message: "创建成功", 
      data: { id: newCategory.id.toString() } 
    }, { status: 201 });

  } catch (error) {
    console.error("创建品类失败:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

// --------------------------------------
// PATCH: 上下架 (Switch Toggle)
// --------------------------------------
const updateSchema = z.object({
  id: z.string(),
  isEnabled: z.number().refine(v => [0, 1].includes(v), "状态只能是0或1"),
});

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, isEnabled } = updateSchema.parse(body);

    await prisma.category.update({
      where: { id: BigInt(id) },
      data: { isEnabled },
    });

    return NextResponse.json({ message: "状态更新成功" });
  } catch (error) {
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}