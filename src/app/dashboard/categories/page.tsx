'use client';
import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Modal, Form, Input, InputNumber, Switch, message, Tag } from 'antd';
import { PlusOutlined, ShoppingOutlined } from '@ant-design/icons';

interface Category {
  id: string;
  name: string;
  unitPrice: number;
  unitMeasure: string;
  isEnabled: number;
}

const CategoriesPage = () => {
  const [list, setList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // 1. 获取列表
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      const json = await res.json();
      if (res.ok) setList(json.data);
    } catch (err) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  // 2. 切换上下架
  const toggleStatus = async (id: string, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    try {
      await fetch('/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isEnabled: newStatus }),
      });
      message.success(newStatus === 1 ? '已上架' : '已下架');
      fetchCategories(); // 刷新
    } catch (e) {
      message.error('操作失败');
    }
  };

  // 3. 提交新增
  const handleCreate = async (values: any) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success('添加成功');
        setIsModalOpen(false);
        form.resetFields();
        fetchCategories();
      } else {
        message.error('添加失败');
      }
    } catch (e) {
      message.error('网络错误');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '品类名称', dataIndex: 'name', width: 200 },
    { 
      title: '单价', 
      dataIndex: 'unitPrice',
      render: (price: number, record: Category) => (
        <span style={{ color: '#faad14', fontWeight: 'bold' }}>
          ¥ {price.toFixed(2)} / {record.unitMeasure}
        </span>
      )
    },
    {
      title: '状态',
      dataIndex: 'isEnabled',
      render: (status: number, record: Category) => (
        <Switch 
          checkedChildren="上架" 
          unCheckedChildren="下架"
          checked={status === 1}
          onChange={() => toggleStatus(record.id, status)}
        />
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card 
        title="服务品类管理" 
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            新建品类
          </Button>
        }
      >
        <Table rowKey="id" columns={columns} dataSource={list} loading={loading} />
      </Card>

      <Modal
        title="新增服务品类"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical" initialValues={{ unitMeasure: '小时' }}>
          <Form.Item name="name" label="品类名称" rules={[{ required: true }]}>
            <Input placeholder="例如：三角洲-基础护航" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="unitPrice" label="单价 (元)" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} min={0} precision={2} />
            </Form.Item>
            <Form.Item name="unitMeasure" label="单位" rules={[{ required: true }]} style={{ width: 100 }}>
              <Input placeholder="小时/局" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default CategoriesPage;