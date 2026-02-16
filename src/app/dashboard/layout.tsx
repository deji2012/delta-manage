'use client';
import React, { useEffect, useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, message, Tag, Spin } from 'antd';
import { 
  UserOutlined, 
  LogoutOutlined, 
  TeamOutlined, 
  SolutionOutlined,
  SafetyCertificateOutlined,
  ShoppingOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';

const { Header, Sider, Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. 初始化检查登录状态
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      message.warning('请先登录');
      router.replace('/login');
      return;
    }
    setUser(JSON.parse(userStr));
    setLoading(false);
  }, [router]);

  // 2. 退出登录逻辑
  const handleLogout = () => {
    localStorage.removeItem('user'); // 清除缓存
    message.success('已安全退出');
    router.replace('/login'); // 跳回登录页
  };

  // 3. 根据角色动态生成菜单 
  const getMenuItems = () => {
    if (!user) return [];

    // 公共菜单
    const items = [
      {
        key: '/dashboard',
        icon: <HomeOutlined />,
        label: '工作台',
      },
      {
        key: '/dashboard/customers',
        icon: <TeamOutlined />,
        label: '客户管理', // 全员可见 [cite: 33, 34, 35]
      }
    ];

    // 管理员独有菜单 [cite: 33]
    if (user.role === 'admin') {
      items.push({
        key: '/dashboard/admin/audit',
        icon: <SafetyCertificateOutlined />,
        label: '注册审批',
      });
      // 可以在这里加更多管理员菜单
      items.push({
        key: '/dashboard/categories',
        icon: <ShoppingOutlined />, // 记得在顶部 import 这个图标
        label: '品类管理',
      });
    }

    // 陪玩独有菜单 [cite: 35]
    if (user.role === 'companion') {
       // items.push({ key: '/dashboard/orders', label: '我的接单' }); // 以后做
    }
    // 所有人都能看“我的任务”
    items.push({
      key: '/dashboard/orders',
      icon: <SolutionOutlined />, // 记得 import 这个图标
      label: '我的任务',
    });
    return items;
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}><Spin size="large" /></div>;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 (Sider) [cite: 30] */}
      <Sider collapsible theme="dark">
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', textAlign: 'center', color: '#fff', lineHeight: '32px', fontWeight: 'bold' }}>
          Delta System
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]} // 自动高亮当前页面
          items={getMenuItems()}
          onClick={(e) => router.push(e.key)} // 点击跳转
        />
      </Sider>

      <Layout>
        {/* 顶部栏 (Header) */}
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,21,41,0.08)' }}>
          {/* 左侧：面包屑或标题（这里简化） */}
          <div style={{ fontSize: 16, fontWeight: 500 }}>三角洲行动报单系统</div>

          {/* 右侧：用户信息与登出 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* 角色徽章 */}
            <Tag color={user.role === 'admin' ? 'red' : 'blue'}>
              {user.role === 'admin' ? '管理员' : (user.role === 'auditor' ? '审核员' : '陪玩')}
            </Tag>
            
            {/* 用户头像下拉菜单 */}
            <Dropdown 
              menu={{
                items: [
                  { 
                    key: 'logout', 
                    icon: <LogoutOutlined />, 
                    label: '退出登录', 
                    onClick: handleLogout 
                  }
                ]
              }}
            >
              <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar style={{ backgroundColor: '#87d068' }} icon={<UserOutlined />} />
                <span>{user.nickname || user.username}</span>
              </span>
            </Dropdown>
          </div>
        </Header>

        {/* 内容区域 */}
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280, borderRadius: 8 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}