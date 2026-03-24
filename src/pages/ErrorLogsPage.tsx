import { useState } from 'react';
import { Card, Table, Tag, Typography, Statistic, Row, Col, Select, Modal, Button, Space, Spin, Empty } from 'antd';
import { BugOutlined, WarningOutlined, ClockCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const APP_API = 'https://runvs.run/api/v1';

function getToken() {
  return localStorage.getItem('runvs_admin_token') || '';
}

async function fetchErrors(page: number, errorType?: string) {
  const params = new URLSearchParams({ page: String(page), per_page: '20' });
  if (errorType) params.set('error_type', errorType);
  const res = await fetch(`${APP_API}/admin/errors?${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to fetch errors');
  return res.json();
}

async function fetchErrorStats() {
  const res = await fetch(`${APP_API}/admin/errors/stats`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export default function ErrorLogsPage() {
  const [page, setPage] = useState(1);
  const [errorType, setErrorType] = useState<string | undefined>();
  const [detail, setDetail] = useState<any>(null);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['error-stats'],
    queryFn: fetchErrorStats,
  });

  const { data: errors, isLoading, refetch: refetchErrors } = useQuery({
    queryKey: ['error-logs', page, errorType],
    queryFn: () => fetchErrors(page, errorType),
  });

  const refetchAll = () => { refetchStats(); refetchErrors(); };

  const columns = [
    {
      title: '시간',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => dayjs(v).format('MM-DD HH:mm:ss'),
    },
    {
      title: '에러 타입',
      dataIndex: 'error_type',
      key: 'error_type',
      width: 200,
      render: (v: string) => <Tag color="red">{v}</Tag>,
    },
    {
      title: '메시지',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: '엔드포인트',
      key: 'endpoint',
      width: 220,
      render: (_: any, r: any) => r.endpoint ? (
        <Text code style={{ fontSize: 12 }}>{r.method} {r.endpoint}</Text>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: '상태',
      dataIndex: 'status_code',
      key: 'status_code',
      width: 80,
      render: (v: number) => <Tag color={v >= 500 ? 'red' : 'orange'}>{v}</Tag>,
    },
    {
      title: '',
      key: 'action',
      width: 80,
      render: (_: any, r: any) => (
        <Button size="small" onClick={() => setDetail(r)}>상세</Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <BugOutlined style={{ marginRight: 8 }} />에러 모니터링
        </Title>
        <Button icon={<ReloadOutlined />} onClick={refetchAll}>새로고침</Button>
      </div>

      {/* 통계 카드 */}
      {statsLoading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
      ) : stats ? (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="24시간 에러"
                value={stats.last_24h}
                prefix={<WarningOutlined />}
                valueStyle={{ color: stats.last_24h > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="7일 에러"
                value={stats.last_7d}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card size="small" title="Top 5 에러 타입" styles={{ body: { padding: '8px 16px' } }}>
              {stats.top_errors?.length > 0 ? (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {stats.top_errors.map((e: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text ellipsis style={{ flex: 1 }}>{e.error_type}</Text>
                      <Tag color="red">{e.count}건</Tag>
                    </div>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">에러 없음</Text>
              )}
            </Card>
          </Col>
        </Row>
      ) : null}

      {/* 필터 */}
      <div style={{ marginBottom: 16 }}>
        <Select
          placeholder="에러 타입 필터"
          allowClear
          style={{ width: 250 }}
          value={errorType}
          onChange={(v) => { setErrorType(v); setPage(1); }}
          options={stats?.top_errors?.map((e: any) => ({ value: e.error_type, label: `${e.error_type} (${e.count})` })) || []}
        />
      </div>

      {/* 테이블 */}
      <Table
        columns={columns}
        dataSource={errors?.items || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          total: errors?.total || 0,
          pageSize: 20,
          onChange: setPage,
          showTotal: (t: number) => `총 ${t}건`,
        }}
        locale={{ emptyText: <Empty description="에러 로그가 없습니다" /> }}
        scroll={{ x: 800 }}
        size="small"
      />

      {/* 상세 모달 */}
      <Modal
        title={detail?.error_type || '에러 상세'}
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width="90%"
        style={{ maxWidth: 800 }}
      >
        {detail && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div>
              <Text strong>시간: </Text>
              <Text>{dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss')}</Text>
            </div>
            <div>
              <Text strong>엔드포인트: </Text>
              <Text code>{detail.method} {detail.endpoint}</Text>
              <Tag color={detail.status_code >= 500 ? 'red' : 'orange'} style={{ marginLeft: 8 }}>{detail.status_code}</Tag>
            </div>
            {detail.user_id && (
              <div>
                <Text strong>유저 ID: </Text>
                <Text copyable>{detail.user_id}</Text>
              </div>
            )}
            <div>
              <Text strong>메시지:</Text>
              <Paragraph style={{ background: '#1a1a1a', padding: 12, borderRadius: 6, marginTop: 4 }}>
                {detail.message}
              </Paragraph>
            </div>
            <div>
              <Text strong>트레이스백:</Text>
              <pre style={{
                background: '#1a1a1a',
                padding: 12,
                borderRadius: 6,
                overflow: 'auto',
                maxHeight: 400,
                fontSize: 12,
                marginTop: 4,
              }}>
                {detail.traceback}
              </pre>
            </div>
            {detail.request_body && (
              <div>
                <Text strong>요청 바디:</Text>
                <pre style={{
                  background: '#1a1a1a',
                  padding: 12,
                  borderRadius: 6,
                  overflow: 'auto',
                  maxHeight: 200,
                  fontSize: 12,
                  marginTop: 4,
                }}>
                  {detail.request_body}
                </pre>
              </div>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
}
