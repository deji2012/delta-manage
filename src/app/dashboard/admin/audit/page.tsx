'use client';
import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Tag, message, Space, Modal } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

const AuditPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // 获取待审核列表
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 调用你的 GET 接口，参数 status=0
      const res = await fetch('/api/admin/users?status=0');
      const json = await res.json();
      if (res.ok) {
        setUsers(json.data);
      } else {
        message.error('获取列表失败');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 审核操作 (通过/驳回)
  const handleAudit = async (userId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      
      if (res.ok) {
        message.success(action === 'approve' ? '已通过' : '已驳回');
        fetchUsers(); // 刷新列表
      } else {
        message.error('操作失败');
      }
    } catch (error) {
      message.error('网络错误');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '昵称', dataIndex: 'nickname', key: 'nickname' },
    { title: '手机', dataIndex: 'phone', key: 'phone' },
    { 
      title: '申请角色', 
      dataIndex: 'role', 
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'auditor' ? 'blue' : 'green'}>
          {role === 'auditor' ? '审核员' : '陪玩'}
        </Tag>
      )
    },
    { title: '申请时间', dataIndex: 'createdAt', key: 'createdAt' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button 
            type="primary" 
            size="small" 
            icon={<CheckOutlined />} 
            onClick={() => handleAudit(record.id, 'approve')}
          >
            通过
          </Button>
          <Button 
            danger 
            size="small" 
            icon={<CloseOutlined />}
            onClick={() => handleAudit(record.id, 'reject')}
          >
            驳回
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="注册审批 (Admin)" extra={<Button onClick={fetchUsers}>刷新</Button>}>
        <Table 
          rowKey="id"
          columns={columns} 
          dataSource={users} 
          loading={loading} 
        />
      </Card>
    </div>
  );
};

export default AuditPage;