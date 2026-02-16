// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
// 确保使用 @ 别名 (只要你的 tsconfig.json 配置正确)
import { prisma } from '@/lib/prisma'; 
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// 定义校验规则
const registerSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符"),
  password: z.string().min(6, "密码至少6个字符"),
  nickname: z.string().min(1, "昵称不能为空"),
  phone: z.string().optional().or(z.literal('')),
  role: z.enum(['auditor', 'companion']), 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 参数校验
    const validation = registerSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { username, password, nickname, phone, role } = validation.data;

    // 唯一性校验
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "用户名已存在" },
        { status: 409 }
      );
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 写入数据库
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        nickname,
        phone,
        role,
        status: 0, 
      },
    });

    // 返回结果
    return NextResponse.json({
      message: "注册成功，等待管理员审核",
      user: {
        id: newUser.id.toString(),
        username: newUser.username,
        role: newUser.role,
        status: newUser.status
      }
    }, { status: 201 });

  } catch (error) {
    console.error("注册失败:", error);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}