'use client';
import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Button, Image, Tag, Modal, Input, message, Spin, Alert } from 'antd';
import { CheckOutlined, CloseOutlined, UndoOutlined, LeftOutlined } from '@ant-design/icons';
// 1. 引入 useParams
import { useRouter, useParams } from 'next/navigation';
import Decimal from 'decimal.js';


// 2. 这里不需要定义 PageProps 了，也不需要接收 props
const OrderDetailPage = () => {
  const router = useRouter();

  // 3. 使用钩子获取路由参数
  // params 可能会是 string 或 array，这里强转一下或者取值
  const params = useParams();
  const orderId = params.id as string; // 获取 URL 中的 id

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // 驳回弹窗状态
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // 初始化
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));

    // 确保拿到 orderId 再请求
    if (orderId) {
      fetchDetail();
    }
  }, [orderId]); // 把 orderId 加入依赖数组

  // 获取详情
  const fetchDetail = async () => {
    try {
      // 4. 这里使用 orderId 变量，而不是 props 里的 params.id
      const res = await fetch(`/api/orders/${orderId}`);
      const json = await res.json();
      if (res.ok) {
        setOrder(json.data);
      } else {
        message.error('获取详情失败');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 渲染操作栏之前，先安全地计算当前订单的陪玩分成
  const calculateCompanionIncome = () => {
    if (!order || !order.totalPrice) return '0.00';
    
    const teammatesCount = order.teammates?.length || 0;
    const totalPeople = 1 + teammatesCount; // 报单人自己 + 队友

    // 公式：总价 * 0.8 / 总人数
    // times(0.8) 乘法，dividedBy(总人数) 除法，toFixed(2) 保留两位小数
    const income = new Decimal(order.totalPrice)
      .times(0.8)
      .dividedBy(totalPeople)
      .toFixed(2); 

    return income;
  };

  // 统一处理操作
  const handleAction = async (action: 'approve' | 'reject' | 'withdraw') => {
    try {
      // 5. 这里也改成 orderId
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: action === 'reject' ? rejectReason : undefined
        }),
      });

      if (res.ok) {
        message.success('操作成功');
        setRejectModalOpen(false);
        fetchDetail();
      } else {
        const json = await res.json();
        message.error(json.error || '操作失败');
      }
    } catch (e) {
      message.error('网络错误');
    }
  };

  if (loading) return <Spin style={{ margin: 50 }} />;
  if (!order) return <div>订单不存在</div>;

  // 渲染操作栏
  const renderActions = () => {
    if (order.status !== 'audit') return null;

    const isAdminOrAuditor = user?.role === 'admin' || user?.role === 'auditor';
    const isCreator = user?.id === order.creatorId;

    return (
      <div style={{ marginTop: 24, display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
        {isAdminOrAuditor && (
          <>
            <Button type="primary" icon={<CheckOutlined />} onClick={() => handleAction('approve')}>
              通过审核
            </Button>
            <Button danger icon={<CloseOutlined />} onClick={() => setRejectModalOpen(true)}>
              驳回
            </Button>
          </>
        )}

        {isCreator && (
          <Button icon={<UndoOutlined />} onClick={() => handleAction('withdraw')}>
            撤回订单
          </Button>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Button icon={<LeftOutlined />} onClick={() => router.back()} style={{ marginBottom: 16 }}>
        返回列表
      </Button>

      <Card title={`订单详情: ${order.orderNo}`} extra={<Tag color="blue">{order.status}</Tag>}>

        {order.rejectReason && (
          <Alert
            title="订单已驳回"
            description={`驳回原因: ${order.rejectReason}`}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Descriptions bordered column={2}>
          <Descriptions.Item label="客户">{order.customer.name}</Descriptions.Item>
          <Descriptions.Item label="报单人">{order.creator.nickname}</Descriptions.Item>
          <Descriptions.Item label="陪玩收入">
            <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
              ¥{calculateCompanionIncome()}
            </span>
            {order.teammates?.length > 0 && (
              <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
                (包含自己共 {1 + order.teammates.length} 人平分 80%)
              </span>
            )}
          </Descriptions.Item>

          {/* 展示队友名字（如果有） */}
          {order.teammates?.length > 0 && (
            <Descriptions.Item label="拼单队友">
              {order.teammates.map((t: any) => <Tag color="cyan" key={t.id}>{t.nickname}</Tag>)}
            </Descriptions.Item>
          )}

          <Descriptions.Item label="品类快照">{order.categorySnapshotName}</Descriptions.Item>
          <Descriptions.Item label="当时的单价">¥{order.unitPriceSnapshot}</Descriptions.Item>

          <Descriptions.Item label="数量/时长">{order.quantity}</Descriptions.Item>
          <Descriptions.Item label="附加费">¥{order.extraFee}</Descriptions.Item>

          <Descriptions.Item label="总价">
            <span style={{ color: '#f50', fontWeight: 'bold', fontSize: 18 }}>¥{order.totalPrice}</span>
          </Descriptions.Item>
          <Descriptions.Item label="指派审核">{order.auditor.nickname}</Descriptions.Item>

          <Descriptions.Item label="创建时间">{new Date(order.createdAt).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="订单ID">{order.id}</Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 24 }}>
          <h4>凭证截图</h4>
          <Image.PreviewGroup>
            <div style={{ display: 'flex', gap: 8 }}>
              {order.proofImgs && order.proofImgs.map((url: string, index: number) => (
                <Image key={index} width={100} src={url} alt="proof" fallback="https://via.placeholder.com/100?text=Error" />
              ))}
              {(!order.proofImgs || order.proofImgs.length === 0) && <span style={{ color: '#999' }}>无截图</span>}
            </div>
          </Image.PreviewGroup>
        </div>

        {renderActions()}

      </Card>

      <Modal
        title="驳回订单"
        open={rejectModalOpen}
        onOk={() => handleAction('reject')}
        onCancel={() => setRejectModalOpen(false)}
        okText="确认驳回"
        okButtonProps={{ danger: true }}
      >
        <Input.TextArea
          rows={4}
          placeholder="请输入驳回原因（必填）"
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default OrderDetailPage;