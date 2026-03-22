'use client';
import React, { useState } from 'react';
import { Card, Tabs, Form, Input, Button, Select, message } from 'antd';
import { UserOutlined, LockOutlined, MobileOutlined, SmileOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 登录处理
  const onLoginFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();

      if (res.ok) {
        message.success('登录成功');
        // 保存用户信息到本地 (简单做法)
        localStorage.setItem('user', JSON.stringify(data.user));
        // 种下一个 Cookie 给后端的 Middleware 看 (有效期 1 天)
        document.cookie = "isLoggedIn=true; path=/; max-age=86400";
        router.push('/dashboard');   

      } else {
        // 处理状态错误提示
        message.error(data.error || '登录失败');
      }
    } catch (error) {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 注册处理
  const onRegisterFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();

      if (res.ok) {
        message.success('注册成功，请等待管理员审核');
        setActiveTab('login'); // 自动切回登录
      } else {
        message.error(data.error || '注册失败');
      }
    } catch (error) {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400 }} title="三角洲行动报单系统">
        <Tabs activeKey={activeTab} onChange={setActiveTab} centered items={[
          {
            key: 'login',
            label: '登录',
            children: (
              <Form onFinish={onLoginFinish} layout="vertical">
                <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                  <Input prefix={<UserOutlined />} placeholder="用户名" />
                </Form.Item>
                <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                  <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                </Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading}>
                  登录
                </Button>
              </Form>
            )
          },
          {
            key: 'register',
            label: '注册',
            children: (
              <Form onFinish={onRegisterFinish} layout="vertical">
                <Form.Item name="role" label="申请角色" initialValue="companion" rules={[{ required: true }]}>
                  {/* 只有审核员和陪玩可选 */}
                  <Select>
                    <Select.Option value="companion">陪玩/打手</Select.Option>
                    <Select.Option value="auditor">审核员</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                  <Input placeholder="用户名 (唯一)" />
                </Form.Item>
                <Form.Item name="nickname" label="昵称" rules={[{ required: true, message: '请输入昵称' }]}>
                  <Input prefix={<SmileOutlined />} placeholder="昵称" />
                </Form.Item>
                <Form.Item name="phone" label="手机号">
                  <Input prefix={<MobileOutlined />} placeholder="手机号" />
                </Form.Item>
                <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                  <Input.Password placeholder="密码" />
                </Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading}>
                  提交申请
                </Button>
              </Form>
            )
          }
        ]} />
      </Card>
    </div>
  );
};

export default LoginPage;