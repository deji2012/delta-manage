// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function RootPage() {
  // 当用户访问根域名 (/) 时，服务器会直接将其重定向到 /login
  redirect('/login');
}