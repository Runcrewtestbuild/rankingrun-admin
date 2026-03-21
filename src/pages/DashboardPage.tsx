import { Card, Col, Row, Statistic, Typography } from 'antd';
import {
  UserOutlined,
  EnvironmentOutlined,
  ThunderboltOutlined,
  FlagOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api';

const { Title } = Typography;

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/admin-api/dashboard/stats').then(r => r.data),
  });

  const { data: signupTrend } = useQuery({
    queryKey: ['signup-trend'],
    queryFn: () => api.get('/admin-api/dashboard/signup-trend').then(r => r.data),
  });

  const { data: runTrend } = useQuery({
    queryKey: ['run-trend'],
    queryFn: () => api.get('/admin-api/dashboard/run-trend').then(r => r.data),
  });

  return (
    <div>
      <Title level={4}>Dashboard</Title>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic title="Total Users" value={stats?.totalUsers ?? '-'} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic title="New Today" value={stats?.newUsersToday ?? '-'} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic title="Total Runs" value={stats?.totalRuns ?? '-'} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic title="Runs Today" value={stats?.runsToday ?? '-'} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic title="Courses" value={stats?.totalCourses ?? '-'} prefix={<EnvironmentOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="Flagged Runs"
              value={stats?.flaggedRuns ?? '-'}
              prefix={<FlagOutlined />}
              valueStyle={{ color: stats?.flaggedRuns > 0 ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic title="Crews" value={stats?.totalCrews ?? '-'} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic title="New This Week" value={stats?.newUsersWeek ?? '-'} prefix={<UserOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Sign-up Trend (30d)">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={signupTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6C5CE7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Run Trend (30d)">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={runTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#00B894" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
