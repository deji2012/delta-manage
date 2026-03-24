'use client';
import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Tag, message, Space, Popconfirm } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

// 定义数据类型，提升代码健壮性和智能提示
interface AuditUser {
  id: string;
  username: string;
  nickname: string;
  phone: string;
  role: string;
  createdAt: string;
}

const AuditPage = () => {
  const [users, setUsers] = useState<AuditUser[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取待审核列表
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 调用你的 GET 接口，参数 status=0
      const res = await fetch('/api/admin/users?status=0');
      const json = await res.json();
      if (res.ok) {
        setUsers(json.data || []); // 防御性赋值，防止 data 为 null 导致 Table 崩溃
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
    { 
      title: '申请时间', 
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString() // 格式化为易读的本地时间
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: AuditUser) => (
        <Space>
          {/* 增加二次确认，防止手滑误触导致错误审核 */}
          <Popconfirm
            title="确认通过"
            description={`确定要通过 ${record.nickname} 的注册申请吗？`}
            onConfirm={() => handleAudit(record.id, 'approve')}
            okText="确定"
            cancelText="取消"
          >
            <Button type="primary" size="small" icon={<CheckOutlined />}>
              通过
            </Button>
          </Popconfirm>
          
          <Popconfirm
            title="确认驳回"
            description="确定要驳回该申请吗？"
            onConfirm={() => handleAudit(record.id, 'reject')}
            okText="确定"
            cancelText="取消"
          >
            <Button danger size="small" icon={<CloseOutlined />}>
              驳回
            </Button>
          </Popconfirm>
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