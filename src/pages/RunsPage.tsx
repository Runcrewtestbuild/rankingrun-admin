import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tag, Tabs, Modal, message, Typography, Space, Tooltip } from 'antd';
import { DeleteOutlined, CheckCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../api';

const { Title } = Typography;

function formatPace(secondsPerKm: number | null) {
  if (!secondsPerKm) return '-';
  const min = Math.floor(secondsPerKm / 60);
  const sec = Math.floor(secondsPerKm % 60);
  return `${min}'${sec.toString().padStart(2, '0')}"`;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}

export default function RunsPage() {
  const [tab, setTab] = useState<'flagged' | 'all'>('flagged');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const endpoint = tab === 'flagged' ? '/admin-api/runs/flagged' : '/admin-api/runs';

  const { data, isLoading } = useQuery({
    queryKey: ['runs', tab, page],
    queryFn: () => api.get(endpoint, { params: { page, limit: 20 } }).then(r => r.data),
  });

  const unflagMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin-api/runs/${id}/unflag`),
    onSuccess: () => { message.success('신고 해제 완료'); queryClient.invalidateQueries({ queryKey: ['runs'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin-api/runs/${id}`),
    onSuccess: () => { message.success('삭제 완료'); queryClient.invalidateQueries({ queryKey: ['runs'] }); },
  });

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '이 런 기록을 삭제하시겠습니까?',
      okText: '삭제',
      cancelText: '취소',
      onOk: () => deleteMutation.mutateAsync(id),
    });
  };

  const baseColumns = [
    { title: '러너', dataIndex: 'nickname', width: 90, ellipsis: true, fixed: 'left' as const },
    { title: '코드', dataIndex: 'user_code', width: 85 },
    {
      title: '거리',
      dataIndex: 'distance_meters',
      width: 75,
      render: (v: number) => v ? `${(v / 1000).toFixed(2)}km` : '-',
    },
    {
      title: '시간',
      dataIndex: 'duration_seconds',
      width: 85,
      render: formatDuration,
    },
    {
      title: '페이스',
      dataIndex: 'avg_pace_seconds_per_km',
      width: 70,
      render: formatPace,
    },
  ];

  const flaggedColumns = [
    ...baseColumns,
    { title: '코스', dataIndex: 'course_title', width: 100, ellipsis: true, render: (v: string) => v || '-' },
    {
      title: '신고 사유',
      dataIndex: 'flag_reason',
      width: 200,
      ellipsis: { showTitle: false },
      render: (v: string) => v ? (
        <Tooltip placement="topLeft" title={v}>
          <Tag color="red" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</Tag>
        </Tooltip>
      ) : '-',
    },
    {
      title: '일시',
      dataIndex: 'created_at',
      width: 130,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '관리',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/runs/${record.id}`)}>상세</Button>
          <Button size="small" icon={<CheckCircleOutlined />} onClick={() => unflagMutation.mutate(record.id)}>
            해제
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
            삭제
          </Button>
        </Space>
      ),
    },
  ];

  const allColumns = [
    ...baseColumns,
    {
      title: '신고',
      dataIndex: 'is_flagged',
      width: 70,
      render: (v: boolean) => v ? <Tag color="red">신고</Tag> : null,
    },
    {
      title: '일시',
      dataIndex: 'created_at',
      width: 130,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '관리',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/runs/${record.id}`)}>상세</Button>
          {record.is_flagged && (
            <Button size="small" icon={<CheckCircleOutlined />} onClick={() => unflagMutation.mutate(record.id)}>
              해제
            </Button>
          )}
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
            삭제
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>런 기록</Title>
      <Tabs
        activeKey={tab}
        onChange={(k) => { setTab(k as any); setPage(1); }}
        items={[
          { key: 'flagged', label: '신고된 런' },
          { key: 'all', label: '전체 런' },
        ]}
      />
      <Table
        rowKey="id"
        columns={tab === 'flagged' ? flaggedColumns : allColumns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        scroll={{ x: tab === 'flagged' ? 970 : 750 }}
        size="small"
        tableLayout="fixed"
        pagination={{
          current: page,
          total: data?.total ?? 0,
          pageSize: 20,
          onChange: setPage,
          showTotal: (total) => `총 ${total}건`,
        }}
      />
    </div>
  );
}
