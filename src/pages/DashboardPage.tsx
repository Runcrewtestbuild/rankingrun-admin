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
      <Title level={4}>대시보드</Title>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic title="전체 유저" value={stats?.totalUsers ?? '-'} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic title="오늘 가입" value={stats?.newUsersToday ?? '-'} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic title="전체 런" value={stats?.totalRuns ?? '-'} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic title="오늘 런" value={stats?.runsToday ?? '-'} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic title="코스" value={stats?.totalCourses ?? '-'} prefix={<EnvironmentOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="신고된 런"
              value={stats?.flaggedRuns ?? '-'}
              prefix={<FlagOutlined />}
              valueStyle={{ color: stats?.flaggedRuns > 0 ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic title="크루" value={stats?.totalCrews ?? '-'} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic title="이번주 가입" value={stats?.newUsersWeek ?? '-'} prefix={<UserOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="가입 추이 (30일)">
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
          <Card title="런 추이 (30일)">
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
