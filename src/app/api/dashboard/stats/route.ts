import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Decimal } from 'decimal.js';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = Number(searchParams.get('userId'));
  const role = searchParams.get('role');

  if (!userId || !role) return NextResponse.json({ error: '参数缺失' }, { status: 400 });

  // 获取当月第一天和最后一天
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  try {
    // 根据角色构建查询条件
    let whereClause: any = {
      createdAt: { gte: startOfMonth, lte: endOfMonth }
    };

    if (role === 'auditor') {
      whereClause.auditorId = userId;
    } else if (role === 'companion') {
      whereClause.OR = [
        { creatorId: userId },
        { teammates: { some: { id: userId } } } // 作为队友参与的也算
      ];
    }

    // 获取当月符合条件的订单
    const orders = await prisma.order.findMany({ where: whereClause });

    // 统计逻辑
    const totalOrders = orders.length;
    const auditingOrders = orders.filter(o => o.status === 'audit').length;
    const rejectedOrders = orders.filter(o => o.status === 'rejected').length;
    
    // 先过滤出只有“审核通过(completed)”的订单
    const completedOrders = orders.filter(o => o.status === 'completed');

    // 客户去重统计
    const uniqueCustomers = new Set(completedOrders.map(o => o.customerId.toString())).size;

    // 金额计算
    // 🌟 核心改造：使用 Decimal 进行高精度计算
    let totalRevenue = new Decimal(0);
    
    // 1. 累加流水
    completedOrders.forEach(o => {
      // plus 是加法
      totalRevenue = totalRevenue.plus(o.totalPrice || 0); 
    });

    // 2. 计算利润和收入 (times 是乘法)
    const totalProfit = totalRevenue.times(0.2); 
    const totalIncome = totalRevenue.times(0.8);

    return NextResponse.json({
      data: {
        totalOrders,
        auditingOrders,
        rejectedOrders,
        uniqueCustomers,
        // 🌟 输出给前端时，用 toNumber() 转回普通数字，或者 toFixed(2) 转为保留两位的字符串
        totalRevenue: totalRevenue.toNumber(),
        totalProfit: totalProfit.toNumber(),
        totalIncome: totalIncome.toNumber()
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "获取统计失败" }, { status: 500 });
  }
}