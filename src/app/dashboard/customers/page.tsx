'use client';
import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Modal, Form, Input, message, Tag } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';

// 定义表格数据类型
interface Customer {
  id: string;
  name: string;
  remark: string;
  creator: { nickname: string };
}

const CustomerPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  
  // 当前登录用户状态
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 1. 初始化：获取当前用户和列表数据
  useEffect(() => {
    // 从 localStorage 读取用户信息 (模拟 Session)
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
    fetchCustomers();
  }, []);

  // 2. 获取客户列表
  const fetchCustomers = async (searchName = '') => {
    setLoading(true);
    try {
      const url = searchName 
        ? `/api/customers?name=${encodeURIComponent(searchName)}` 
        : '/api/customers';
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setCustomers(json.data);
      } else {
        message.error('加载失败');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 3. 提交新客户
  const handleCreate = async (values: any) => {
    if (!currentUser) {
      message.error('登录状态失效');
      return;
    }

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          creatorId: currentUser.id, // 将当前管理员ID传给后端
        }),
      });

      const json = await res.json();
      if (res.ok) {
        message.success('添加成功');
        setIsModalOpen(false);
        form.resetFields();
        fetchCustomers(); // 刷新列表
      } else {
        message.error(json.error || '添加失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  // 表格列定义
  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '客户名称', dataIndex: 'name', key: 'name' },
    { title: '备注', dataIndex: 'remark', key: 'remark' },
    { 
      title: '录入人', 
      dataIndex: ['creator', 'nickname'], // 嵌套数据访问
      key: 'creator',
      render: (text: string) => <Tag>{text}</Tag>
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card 
        title="客户库管理" 
        extra={
          //  只有 admin 显示新增按钮
          currentUser?.role === 'admin' && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setIsModalOpen(true)}
            >
              新增客户
            </Button>
          )
        }
      >
        {/* 搜索栏 (简单版) */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <Input.Search 
              placeholder="搜索客户昵称" 
              onSearch={(value) => fetchCustomers(value)} 
              style={{ width: 300 }}
              allowClear
            />
        </div>

        <Table 
          rowKey="id"
          columns={columns} 
          dataSource={customers} 
          loading={loading} 
        />
      </Card>

      {/* 新增弹窗 [cite: 38] */}
      <Modal
        title="录入新客户"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={loading}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item 
            name="name" 
            label="客户昵称" 
            rules={[{ required: true, max: 50, message: '必填，且不超过50字' }]} // [cite: 39]
          >
            <Input placeholder="老板的游戏ID或昵称" />
          </Form.Item>
          <Form.Item 
            name="remark" 
            label="备注"
            rules={[{ max: 200, message: '备注太长了' }]} // [cite: 40]
          >
            <Input.TextArea rows={3} placeholder="例如：很爽快，喜欢玩奶妈" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CustomerPage;