import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Table, Button, Space, Spin, Typography, Statistic, Row, Col } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../api';

const { Title } = Typography;

const difficultyLabel: Record<string, { color: string; text: string }> = {
  easy: { color: 'green', text: '쉬움' },
  moderate: { color: 'blue', text: '보통' },
  hard: { color: 'orange', text: '어려움' },
  extreme: { color: 'red', text: '극한' },
};

function formatPace(v: number | null) {
  if (!v) return '-';
  return `${Math.floor(v / 60)}'${Math.floor(v % 60).toString().padStart(2, '0')}"`;
}

function formatDuration(s: number | null) {
  if (!s) return '-';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0 ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => api.get(`/admin-api/courses/${id}`).then(r => r.data),
  });

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!data) return null;

  const d = difficultyLabel[data.difficulty] || null;
  const stats = data.stats;

  const runColumns = [
    { title: '러너', dataIndex: 'nickname', width: 100 },
    {
      title: '거리',
      dataIndex: 'distance_meters',
      render: (v: number) => v ? `${(v / 1000).toFixed(2)}km` : '-',
    },
    { title: '시간', dataIndex: 'duration_seconds', render: formatDuration },
    { title: '페이스', dataIndex: 'avg_pace_seconds_per_km', render: formatPace },
    {
      title: '신고',
      dataIndex: 'is_flagged',
      render: (v: boolean) => v ? <Tag color="red">신고됨</Tag> : null,
    },
    {
      title: '일시',
      dataIndex: 'created_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '',
      render: (_: any, record: any) => (
        <Button size="small" type="link" onClick={() => navigate(`/runs/${record.id}`)}>상세</Button>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/courses')}>코스 목록</Button>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>{data.title}</Title>
          {d && <Tag color={d.color}>{d.text}</Tag>}
          {data.is_public ? <Tag color="green">공개</Tag> : <Tag>비공개</Tag>}
        </div>

        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} bordered size="small">
          <Descriptions.Item label="거리">{data.distance_meters ? `${(data.distance_meters / 1000).toFixed(2)}km` : '-'}</Descriptions.Item>
          <Descriptions.Item label="코스 유형">{data.course_type || '-'}</Descriptions.Item>
          <Descriptions.Item label="랩 수">{data.lap_count ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="누적 고도">{data.elevation_gain_meters ? `${data.elevation_gain_meters}m` : '-'}</Descriptions.Item>
          <Descriptions.Item label="생성자">{data.creator_nickname || '-'} ({data.creator_code || '-'})</Descriptions.Item>
          <Descriptions.Item label="태그">{data.tags?.length ? data.tags.join(', ') : '-'}</Descriptions.Item>
          <Descriptions.Item label="설명" span={3}>{data.description || '-'}</Descriptions.Item>
          <Descriptions.Item label="생성일">{dayjs(data.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="최근 수정">{data.updated_at ? dayjs(data.updated_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {stats && (
        <Card title="코스 통계" style={{ marginBottom: 16 }} size="small">
          <Row gutter={[16, 16]}>
            <Col xs={8} sm={6} lg={4}>
              <Statistic title="총 런" value={stats.total_runs ?? 0} />
            </Col>
            <Col xs={8} sm={6} lg={4}>
              <Statistic title="러너 수" value={stats.unique_runners ?? 0} />
            </Col>
            <Col xs={8} sm={6} lg={4}>
              <Statistic title="완주율" value={stats.completion_rate ? `${(stats.completion_rate * 100).toFixed(0)}%` : '-'} />
            </Col>
            <Col xs={8} sm={6} lg={4}>
              <Statistic title="평균 시간" value={formatDuration(stats.avg_duration_seconds)} />
            </Col>
            <Col xs={8} sm={6} lg={4}>
              <Statistic title="평균 페이스" value={formatPace(stats.avg_pace_seconds_per_km)} />
            </Col>
            <Col xs={8} sm={6} lg={4}>
              <Statistic title="최고 페이스" value={formatPace(stats.best_pace_seconds_per_km)} />
            </Col>
          </Row>
        </Card>
      )}

      <Card title="최근 런 기록" size="small">
        <Table
          rowKey="id"
          columns={runColumns}
          dataSource={data.recentRuns ?? []}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
