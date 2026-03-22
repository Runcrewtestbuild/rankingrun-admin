import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Table, Button, Space, Spin, Typography, Statistic, message } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../api';

const { Title, Text } = Typography;

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/admin-api/events/${id}`).then(r => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: () => api.post(`/admin-api/events/${id}/toggle-active`),
    onSuccess: (res) => {
      message.success(res.data.is_active ? '활성화됨' : '비활성화됨');
      queryClient.invalidateQueries({ queryKey: ['event', id] });
    },
  });

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!data) return null;

  const now = dayjs();
  const ended = data.ends_at && dayjs(data.ends_at).isBefore(now);
  const statusTag = !data.is_active
    ? <Tag>비활성</Tag>
    : ended
    ? <Tag color="default">종료</Tag>
    : <Tag color="green">진행중</Tag>;

  const participantColumns = [
    {
      title: '닉네임',
      dataIndex: 'nickname',
      render: (v: string, record: any) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/users/${record.user_id}`)}>{v}</Button>
      ),
    },
    { title: '코드', dataIndex: 'user_code', width: 100 },
    {
      title: '진행 거리',
      dataIndex: 'progress_distance_meters',
      width: 100,
      render: (v: number) => v ? `${(v / 1000).toFixed(1)}km` : '0km',
    },
    { title: '진행 횟수', dataIndex: 'progress_runs', width: 80 },
    {
      title: '완료',
      dataIndex: 'completed',
      width: 70,
      render: (v: boolean) => v ? <Tag color="green">완료</Tag> : <Tag>진행중</Tag>,
    },
    {
      title: '참가일',
      dataIndex: 'joined_at',
      width: 130,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/events')}>이벤트 목록</Button>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <Title level={4} style={{ margin: 0 }}>{data.title}</Title>
            {data.course_title && <Text type="secondary">코스: {data.course_title}</Text>}
          </div>
          <Space>
            {statusTag}
            <Tag>{data.event_type}</Tag>
            <Button
              icon={data.is_active ? <PauseCircleOutlined /> : <CheckCircleOutlined />}
              onClick={() => toggleMutation.mutate()}
              loading={toggleMutation.isPending}
            >
              {data.is_active ? '비활성화' : '활성화'}
            </Button>
          </Space>
        </div>

        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} bordered size="small">
          <Descriptions.Item label="생성자">{data.creator_nickname || '-'}</Descriptions.Item>
          <Descriptions.Item label="시작일">{data.starts_at ? dayjs(data.starts_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
          <Descriptions.Item label="종료일">{data.ends_at ? dayjs(data.ends_at).format('YYYY-MM-DD HH:mm') : '무기한'}</Descriptions.Item>
          <Descriptions.Item label="목표 거리">{data.target_distance_meters ? `${(data.target_distance_meters / 1000).toFixed(1)}km` : '-'}</Descriptions.Item>
          <Descriptions.Item label="목표 횟수">{data.target_runs ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="최대 인원">{data.max_participants ?? '제한 없음'}</Descriptions.Item>
          <Descriptions.Item label="뱃지">
            <Space>
              {data.badge_color && <div style={{ width: 16, height: 16, borderRadius: 4, background: data.badge_color, border: '1px solid #555' }} />}
              {data.badge_icon || '-'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="생성일">{dayjs(data.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          {data.description && (
            <Descriptions.Item label="설명" span={3}>{data.description}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {data.stats && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <Statistic title="총 참가자" value={data.stats.total_participants} />
            <Statistic title="완료" value={data.stats.completed_count} />
            <Statistic title="완주율" value={data.stats.total_participants ? Math.round((data.stats.completed_count / data.stats.total_participants) * 100) : 0} suffix="%" />
            <Statistic title="총 거리" value={data.stats.total_distance ? `${(data.stats.total_distance / 1000).toFixed(1)}` : '0'} suffix="km" />
            <Statistic title="총 러닝 수" value={data.stats.total_runs} />
          </div>
        </Card>
      )}

      <Card title={`참가자 (${data.participants?.length ?? 0}명)`} size="small">
        <Table
          rowKey="user_id"
          columns={participantColumns}
          dataSource={data.participants ?? []}
          pagination={data.participants?.length > 20 ? { pageSize: 20, size: 'small' } : false}
          size="small"
        />
      </Card>
    </div>
  );
}
