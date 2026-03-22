'use client';
import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Spin } from 'antd';
import { AccountBookOutlined, FileDoneOutlined, UserOutlined, WarningOutlined } from '@ant-design/icons';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const fetchStats = async (userId: number, role: string) => {
    const res = await fetch(`/api/dashboard/stats?userId=${userId}&role=${role}`);
    const json = await res.json();
    if (res.ok) setStats(json.data);
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      setUser(parsedUser);
      fetchStats(parsedUser.id, parsedUser.role);
    }
  }, []);

  if (!stats || !user) return <Spin style={{ margin: 50 }} />;

  return (
    <div style={{ padding: 24 }}>
      <h2>📊 当月数据总览</h2>
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* 所有人共有的基础数据 */}
        <Col span={6}>
          <Card><Statistic title="当月报单总数" value={stats.totalOrders} prefix={<FileDoneOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="正在审核单量" value={stats.auditingOrders} styles={{ content: { color: '#faad14' } }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="已驳回单量" value={stats.rejectedOrders} prefix={<WarningOutlined />} styles={{ content: { color: '#cf1322' } }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="服务客户数" value={stats.uniqueCustomers} prefix={<UserOutlined />} /></Card>
        </Col>

        {/* 管理员专属：流水、利润 */}
        {user.role === 'admin' && (
          <>
            <Col span={6}>
              <Card><Statistic title="当月流水" value={stats.totalRevenue} precision={2} prefix="¥" styles={{ content: { color: '#3f8600' } }}/></Card>
            </Col>
            <Col span={6}>
              <Card><Statistic title="当月利润 (20%)" value={stats.totalProfit} precision={2} prefix="¥" styles={{ content: { color: '#1677ff' } }}/></Card>
            </Col>
          </>
        )}

        {/* 审核员专属：当月收入 */}
        {user.role === 'auditor' && (
          <Col span={6}>
            <Card><Statistic title="当月收入 (80%)" value={stats.totalIncome} precision={2} prefix="¥" styles={{ content: { color: '#3f8600' } }}/></Card>
          </Col>
        )}
      </Row>
    </div>
  );
}