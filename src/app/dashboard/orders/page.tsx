'use client';
import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Modal, Form, InputNumber, Select, message, Tag, Upload, Descriptions, Input, List } from 'antd';
import { PlusOutlined, UploadOutlined, CalculatorOutlined } from '@ant-design/icons';
import Link from 'next/link';

// -----------------------------------
// 辅助组件：状态标签渲染
// -----------------------------------
const StatusTag = ({ status }: { status: string }) => {
  const map: any = {
    audit: { color: 'blue', text: '审核中' },
    completed: { color: 'green', text: '已完成' },
    rejected: { color: 'red', text: '已驳回' },
    withdrawn: { color: 'default', text: '已撤回' },
  };
  const current = map[status] || { color: 'default', text: status };
  return <Tag color={current.color}>{current.text}</Tag>;
};

const OrdersPage = () => {
  // 基础状态
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasTeammates, setHasTeammates] = useState(false);
  const [teammateModalOpen, setTeammateModalOpen] = useState(false);
  const [teammateSearchKeyword, setTeammateSearchKeyword] = useState('');
  const [searchResult, setSearchResult] = useState<any[]>([]);
  const [selectedTeammates, setSelectedTeammates] = useState<any[]>([]); // 存放选中的队友
  // 弹窗相关数据源
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [auditors, setAuditors] = useState([]);

  // 表单与动态计算
  const [form] = Form.useForm();
  const selectedCategory = Form.useWatch('categoryId', form); // 监听品类选择
  const inputQuantity = Form.useWatch('quantity', form);      // 监听数量输入
  const inputExtra = Form.useWatch('extraFee', form);         // 监听附加费

  // 计算预估价格 (仅展示用，实际以用来后端算)
  const estimatedPrice = React.useMemo(() => {
    if (!selectedCategory || !inputQuantity) return 0;
    // 找到选中的品类对象
    const cat = categories.find(c => c.id === selectedCategory);
    if (!cat) return 0;
    const base = cat.unitPrice * inputQuantity;
    const extra = inputExtra || 0;
    return base + extra;
  }, [selectedCategory, inputQuantity, inputExtra, categories]);

  // 1. 初始化
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      setUser(u);
      fetchOrders(u);
    }
  }, []);

  // 2. 获取订单列表
  const fetchOrders = async (currentUser: any) => {
    setLoading(true);
    try {
      // 传入当前用户ID和角色，让后端过滤
      const res = await fetch(`/api/orders?userId=${currentUser.id}&role=${currentUser.role}`);
      const json = await res.json();
      if (res.ok) setOrders(json.data);
    } catch (error) {
      message.error('加载订单失败');
    } finally {
      setLoading(false);
    }
  };

  // 搜索队友函数
  const handleSearchTeammates = async () => {
    const res = await fetch(`/api/users/search?keyword=${teammateSearchKeyword}`);
    const json = await res.json();
    if (res.ok) setSearchResult(json.data);
  };

  // 3. 打开弹窗时加载下拉选项
  const openCreateModal = async () => {
    setIsModalOpen(true);
    // 并行加载三个下拉框的数据
    try {
      const [resCust, resCat, resAud] = await Promise.all([
        fetch('/api/customers').then(r => r.json()),
        fetch('/api/categories?isEnabled=1').then(r => r.json()), // 只查上架的
        fetch('/api/common/auditors').then(r => r.json())
      ]);
      setCustomers(resCust.data || []);
      setCategories(resCat.data || []);
      setAuditors(resAud.data || []);
    } catch (e) {
      message.error('加载选项数据失败');
    }
  };

  // 4. 提交报单
  const handleSubmit = async (values: any) => {
    if (!user) return;
    setSubmitting(true);
    try {
      // 提取队友的 ID
      // 只有在选择了“有队友”的情况下，才去 map 取出选中的队友 id
      const teammateIds = hasTeammates ? selectedTeammates.map((t: any) => t.id) : [];
      const payload = {
        ...values,
        creatorId: user.id,
        // 这里简化处理：我们没有做真实的文件上传，直接模拟一个空数组或假图片
        proofImgs: ["https://fake-img-url.com/1.jpg"],
        // 将队友 ID 数组放进 payload 传给后端
        teammateIds: teammateIds
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok) {
        message.success('报单成功！');
        setIsModalOpen(false);
        form.resetFields();
        // 报单成功后，清空刚才选中的队友状态
        setHasTeammates(false); 
        setSelectedTeammates([]);
        fetchOrders(user);
      } else {
        message.error(json.error || '报单失败');
      }
    } catch (e) {
      message.error('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '单号',
      dataIndex: 'orderNo',
      width: 150,
      render: (text: string, record: any) => (
        // 点击单号跳转到详情页
        <Link href={`/dashboard/orders/${record.id}`} style={{ color: '#1677ff', fontWeight: 'bold' }}>
          {text}
        </Link>
      )
    },
    { title: '客户', dataIndex: ['customer', 'name'] },
    {
      title: '品类快照',
      render: (r: any) => (
        <div>
          <div>{r.categorySnapshotName}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            ¥{r.unitPriceSnapshot}/单位
          </div>
        </div>
      )
    },
    { title: '数量', dataIndex: 'quantity' },
    { title: '总价', dataIndex: 'totalPrice', render: (v: number) => <b style={{ color: '#f50' }}>¥{v}</b> },
    { title: '状态', dataIndex: 'status', render: (s: string) => <StatusTag status={s} /> },
    { title: '派单给', dataIndex: ['auditor', 'nickname'] },
    { title: '创建时间', dataIndex: 'createdAt', width: 180 },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="我的任务"
        extra={
          // 只有陪玩能看见创建按钮
          user?.role === 'companion' && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              发起报单
            </Button>
          )
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={orders}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 创建订单弹窗 */}
      <Modal
        title="创建新订单"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
        confirmLoading={submitting}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="customerId" label="选择客户" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="请选择老板" showSearch optionFilterProp="label"
                options={customers.map((c: any) => ({ label: c.name, value: c.id }))}
              />
            </Form.Item>
            <Form.Item name="auditorId" label="指派审核员" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="谁来审核？"
                options={auditors.map((a: any) => ({ label: a.nickname || a.username, value: a.id }))}
              />
            </Form.Item>
            <Form.Item label="是否有队友">
              <Select
                value={hasTeammates}
                onChange={(val) => {
                  setHasTeammates(val);
                  if (!val) setSelectedTeammates([]); // 选否则清空队友
                }}
                options={[{ label: '否', value: false }, { label: '是', value: true }]}
              />
            </Form.Item>

            {hasTeammates && (
              <Form.Item label="队友名称">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedTeammates.map(t => (
                    <Tag closable onClose={() => setSelectedTeammates(prev => prev.filter(p => p.id !== t.id))} key={t.id}>
                      {t.nickname}
                    </Tag>
                  ))}
                  <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => setTeammateModalOpen(true)}>
                    添加队友
                  </Button>
                </div>
              </Form.Item>
            )}
          </div>

          <Card size="small" title="计价信息" style={{ background: '#f9f9f9', marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item name="categoryId" label="服务品类" rules={[{ required: true }]} style={{ flex: 2 }}>
                <Select placeholder="选择服务类型">
                  {categories.map((c: any) => (
                    <Select.Option key={c.id} value={c.id}>
                      {c.name} (¥{c.unitPrice}/{c.unitMeasure})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="quantity" label="时长/数量" rules={[{ required: true }]} style={{ flex: 1 }}>
                <InputNumber min={0.1} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="extraFee" label="附加费(红包)" initialValue={0} style={{ flex: 1 }}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </div>

            {/* 动态计算结果展示 */}
            <div style={{ textAlign: 'right', fontSize: 16 }}>
              预估总价: <CalculatorOutlined /> <span style={{ color: '#f50', fontWeight: 'bold', fontSize: 20 }}>¥ {estimatedPrice.toFixed(2)}</span>
            </div>
          </Card>

          <Form.Item label="战绩截图/凭证">
            {/* 暂时只是 UI 摆设，因为没有写上传接口 */}
            <Upload listType="picture-card">
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>上传</div>
              </div>
            </Upload>
            <div style={{ color: '#999', fontSize: 12 }}>* 当前演示模式下，图片不会真实上传，系统将使用默认占位图。</div>
          </Form.Item>
        </Form>
      </Modal>
      {/* 在页面底部添加一个专门搜索队友的弹窗 */}
      <Modal
        title="搜索队友"
        open={teammateModalOpen}
        onCancel={() => setTeammateModalOpen(false)}
        footer={null}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input
            placeholder="输入陪玩昵称搜索"
            value={teammateSearchKeyword}
            onChange={e => setTeammateSearchKeyword(e.target.value)}
            onPressEnter={handleSearchTeammates}
          />
          <Button type="primary" onClick={handleSearchTeammates}>搜索</Button>
        </div>

        <List
          dataSource={searchResult}
          renderItem={(item: any) => (
            <List.Item
              actions={[
                <Button
                  size="small"
                  type="primary"
                  key={item.id}
                  disabled={selectedTeammates.some(t => t.id === item.id)} // 防止重复添加
                  onClick={() => {
                    setSelectedTeammates([...selectedTeammates, item]);
                    message.success('已添加');
                  }}
                >
                  添加
                </Button>
              ]}
            >
              <List.Item.Meta title={item.nickname} description={`账号: ${item.username}`} />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default OrdersPage;