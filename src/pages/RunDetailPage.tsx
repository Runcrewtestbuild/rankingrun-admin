import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Space, Spin, Typography, message, Modal } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons';
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

function formatSpeed(ms: number | null) {
  if (!ms) return '-';
  return `${(ms * 3.6).toFixed(1)} km/h`;
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['run', id],
    queryFn: () => api.get(`/admin-api/runs/${id}`).then(r => r.data),
  });

  const unflagMutation = useMutation({
    mutationFn: () => api.post(`/admin-api/runs/${id}/unflag`),
    onSuccess: () => { message.success('신고 해제 완료'); queryClient.invalidateQueries({ queryKey: ['run', id] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/admin-api/runs/${id}`),
    onSuccess: () => { message.success('삭제 완료'); navigate('/runs'); },
  });

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!data) return null;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/runs')}>런 기록 목록</Button>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>런 기록 상세</Title>
          {data.is_flagged && <Tag color="red">신고됨</Tag>}
          <div style={{ marginLeft: 'auto' }}>
            <Space>
              {data.is_flagged && (
                <Button icon={<CheckCircleOutlined />} onClick={() => unflagMutation.mutate()}>
                  신고 해제
                </Button>
              )}
              <Button danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({
                title: '이 런 기록을 삭제하시겠습니까?',
                okText: '삭제',
                cancelText: '취소',
                onOk: () => deleteMutation.mutateAsync(),
              })}>삭제</Button>
            </Space>
          </div>
        </div>

        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} bordered size="small">
          <Descriptions.Item label="러너">
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/users/${data.user_id}`)}>
              {data.nickname} ({data.user_code})
            </Button>
          </Descriptions.Item>
          <Descriptions.Item label="코스">
            {data.course_id ? (
              <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/courses/${data.course_id}`)}>
                {data.course_title}
              </Button>
            ) : '자유 런닝'}
          </Descriptions.Item>
          <Descriptions.Item label="소스">{data.source || 'app'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="런닝 데이터" style={{ marginBottom: 16 }} size="small">
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} bordered size="small">
          <Descriptions.Item label="거리">{data.distance_meters ? `${(data.distance_meters / 1000).toFixed(2)}km` : '-'}</Descriptions.Item>
          <Descriptions.Item label="운동 시간">{formatDuration(data.duration_seconds)}</Descriptions.Item>
          <Descriptions.Item label="총 경과 시간">{formatDuration(data.total_elapsed_seconds)}</Descriptions.Item>
          <Descriptions.Item label="평균 페이스">{formatPace(data.avg_pace_seconds_per_km)}</Descriptions.Item>
          <Descriptions.Item label="최고 페이스">{formatPace(data.best_pace_seconds_per_km)}</Descriptions.Item>
          <Descriptions.Item label="칼로리">{data.calories ? `${data.calories} kcal` : '-'}</Descriptions.Item>
          <Descriptions.Item label="평균 속도">{formatSpeed(data.avg_speed_ms)}</Descriptions.Item>
          <Descriptions.Item label="최고 속도">{formatSpeed(data.max_speed_ms)}</Descriptions.Item>
          <Descriptions.Item label="누적 상승">{data.elevation_gain_meters ? `${data.elevation_gain_meters}m` : '-'}</Descriptions.Item>
          <Descriptions.Item label="누적 하강">{data.elevation_loss_meters ? `${data.elevation_loss_meters}m` : '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {data.course_id && (
        <Card title="코스 매칭" style={{ marginBottom: 16 }} size="small">
          <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} bordered size="small">
            <Descriptions.Item label="코스 완주">
              {data.course_completed === null ? '-' : data.course_completed ? <Tag color="green">완주</Tag> : <Tag color="red">미완주</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="경로 일치율">
              {data.route_match_percent != null ? `${(data.route_match_percent * 100).toFixed(1)}%` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="최대 이탈 거리">
              {data.max_deviation_meters != null ? `${data.max_deviation_meters.toFixed(0)}m` : '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {data.is_flagged && (
        <Card title="신고 정보" style={{ marginBottom: 16 }} size="small">
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="신고 사유">{data.flag_reason || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Card title="시간 정보" size="small">
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} bordered size="small">
          <Descriptions.Item label="시작">{dayjs(data.started_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
          <Descriptions.Item label="종료">{dayjs(data.finished_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
          <Descriptions.Item label="기록 생성">{dayjs(data.created_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
