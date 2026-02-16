'use client';
import { Card, Statistic, Row, Col } from 'antd';
import { UserOutlined, ShoppingCartOutlined } from '@ant-design/icons';

export default function DashboardHome() {
  return (
    <div>
      <h2>欢迎回来，开始一天的工作吧！</h2>
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="活跃客户" value={12} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="今日订单" value={0} prefix={<ShoppingCartOutlined />} />
          </Card>
        </Col>
      </Row>
      
      <div style={{ marginTop: 24, padding: 20, background: '#fafafa', borderRadius: 8 }}>
        <p>系统公告：新赛季价格表已更新，请注意查看品类管理。</p>
      </div>
    </div>
  );
}