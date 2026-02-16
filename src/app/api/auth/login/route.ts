import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // 确保你的 tsconfig.json 已经修好，可以使用 @ 别名
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// 1. 定义校验规则 (Zod)
const loginSchema = z.object({
  username: z.string().min(1, "用户名不能为空"),
  password: z.string().min(1, "密码不能为空"),
});

export async function POST(request: Request) {
  try {
    // 解析请求体
    const body = await request.json();

    // 2. 参数格式校验
    const validation = loginSchema.safeParse(body);
    
    if (!validation.success) {
      // 返回参数错误
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { username, password } = validation.data;

    // 3. 查找用户
    const user = await prisma.user.findUnique({
      where: { username },
    });

    // 用户不存在时的处理（为了安全，通常模糊提示）
    if (!user) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 4. 验证密码 (比对哈希)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 5. 核心业务：检查用户状态 (Status Check)
    // 根据规格说明书 [cite: 14, 28, 29]
    // status: 0:待审核, 1:正常, 2:禁用, 3:驳回
    
    // 情况 A: 待审核
    if (user.status === 0) {
      return NextResponse.json(
        { error: "账号正在审核中，请联系管理员" },
        { status: 403 } // Forbidden
      );
    }

    // 情况 B: 已驳回
    if (user.status === 3) {
      return NextResponse.json(
        { error: "账号申请已被驳回" }, 
        { status: 403 }
      );
    }

    // 情况 C: 已禁用 (虽然规格书未详细描述交互，但通常不允许登录)
    if (user.status === 2) {
      return NextResponse.json(
        { error: "账号已被禁用" },
        { status: 403 }
      );
    }

    // 6. 登录成功 (Status = 1)
    // 返回用户信息（不包含密码）
    return NextResponse.json({
      message: "登录成功",
      user: {
        id: user.id.toString(), // BigInt 必须转字符串
        username: user.username,
        nickname: user.nickname,
        role: user.role,
        status: user.status
      }
    }, { status: 200 });

  } catch (error) {
    console.error("登录接口报错:", error);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}