import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Table, Button, Space, Avatar, Spin, Typography, message, Modal } from 'antd';
import { ArrowLeftOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../api';

const { Title } = Typography;

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

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => api.get(`/admin-api/users/${id}`).then(r => r.data),
  });

  const banMutation = useMutation({
    mutationFn: () => api.post(`/admin-api/users/${id}/ban`, { reason: 'Admin action' }),
    onSuccess: () => { message.success('차단 완료'); queryClient.invalidateQueries({ queryKey: ['user', id] }); },
  });

  const unbanMutation = useMutation({
    mutationFn: () => api.post(`/admin-api/users/${id}/unban`),
    onSuccess: () => { message.success('차단 해제 완료'); queryClient.invalidateQueries({ queryKey: ['user', id] }); },
  });

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!data) return null;

  const runColumns = [
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
      render: (v: boolean, record: any) =>
        v ? <Tag color="red">{record.flag_reason || '신고됨'}</Tag> : <Tag color="green">정상</Tag>,
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
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/users')}>유저 목록</Button>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <Avatar size={64} src={data.avatar_url}>{data.nickname?.[0]}</Avatar>
          <div>
            <Title level={4} style={{ margin: 0 }}>{data.nickname || '(닉네임 없음)'}</Title>
            <span style={{ color: '#999' }}>{data.user_code}</span>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            {data.is_banned ? (
              <Space>
                <Tag color="red">차단됨</Tag>
                <Button icon={<CheckCircleOutlined />} onClick={() => unbanMutation.mutate()}>차단 해제</Button>
              </Space>
            ) : (
              <Button danger icon={<StopOutlined />} onClick={() => Modal.confirm({
                title: `"${data.nickname}" 유저를 차단하시겠습니까?`,
                okText: '차단',
                cancelText: '취소',
                onOk: () => banMutation.mutateAsync(),
              })}>차단</Button>
            )}
          </div>
        </div>

        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} bordered size="small">
          <Descriptions.Item label="이메일">{data.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="레벨">{data.runner_level}</Descriptions.Item>
          <Descriptions.Item label="총 런 횟수">{data.total_runs}회</Descriptions.Item>
          <Descriptions.Item label="총 거리">{data.total_distance_meters ? `${(data.total_distance_meters / 1000).toFixed(1)}km` : '0km'}</Descriptions.Item>
          <Descriptions.Item label="포인트">{data.total_points?.toLocaleString() ?? 0}</Descriptions.Item>
          <Descriptions.Item label="자기소개">{data.bio || '-'}</Descriptions.Item>
          <Descriptions.Item label="가입일">{dayjs(data.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="최근 수정">{data.updated_at ? dayjs(data.updated_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
          {data.is_banned && (
            <>
              <Descriptions.Item label="차단 사유">{data.banned_reason || '-'}</Descriptions.Item>
              <Descriptions.Item label="차단 해제일">{data.banned_until ? dayjs(data.banned_until).format('YYYY-MM-DD HH:mm') : '무기한'}</Descriptions.Item>
            </>
          )}
        </Descriptions>
      </Card>

      {data.socialAccounts?.length > 0 && (
        <Card title="소셜 계정" style={{ marginBottom: 16 }} size="small">
          <Descriptions column={2} size="small">
            {data.socialAccounts.map((sa: any, i: number) => (
              <Descriptions.Item key={i} label={sa.provider}>{sa.provider_email || '-'}</Descriptions.Item>
            ))}
          </Descriptions>
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
