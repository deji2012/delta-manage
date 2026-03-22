// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 这是全局路由守卫函数
export function middleware(request: NextRequest) {
  // 获取用户当前想访问的路径
  const { pathname } = request.nextUrl;

  // 1. 判断是否是需要保护的路由 (比如以 /dashboard 开头的所有页面)
  if (pathname.startsWith('/dashboard')) {
    
    // 2. 尝试从 Cookie 中获取登录凭证
    const isLoggedIn = request.cookies.get('isLoggedIn');

    // 3. 如果没登录，直接一脚踢回 /login
    if (!isLoggedIn) {
      // 携带原来的路径，方便登录后跳回来（可选拓展功能）
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 4. 如果已登录，或者访问的是公开页面，直接放行
  return NextResponse.next();
}

// 优化配置：告诉 Next.js 这个中间件只在特定路径下触发，节省性能
export const config = {
  matcher: [
    /*
     * 匹配所有以 /dashboard 开头的路径
     * 例如: /dashboard, /dashboard/orders, /dashboard/customers
     */
    '/dashboard/:path*',
  ],
};