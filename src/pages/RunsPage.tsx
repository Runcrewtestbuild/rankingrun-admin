import { useState } from 'react';
import { Table, Button, Tag, Tabs, Modal, message, Typography, Space } from 'antd';
import { DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
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
  const queryClient = useQueryClient();

  const endpoint = tab === 'flagged' ? '/admin-api/runs/flagged' : '/admin-api/runs';

  const { data, isLoading } = useQuery({
    queryKey: ['runs', tab, page],
    queryFn: () => api.get(endpoint, { params: { page, limit: 20 } }).then(r => r.data),
  });

  const unflagMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin-api/runs/${id}/unflag`),
    onSuccess: () => { message.success('Unflagged'); queryClient.invalidateQueries({ queryKey: ['runs'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin-api/runs/${id}`),
    onSuccess: () => { message.success('Deleted'); queryClient.invalidateQueries({ queryKey: ['runs'] }); },
  });

  const handleDelete = (id: string) => {
    Modal.confirm({ title: 'Delete this run record?', onOk: () => deleteMutation.mutateAsync(id) });
  };

  const columns = [
    { title: 'Runner', dataIndex: 'nickname' },
    { title: 'Code', dataIndex: 'user_code', width: 90 },
    {
      title: 'Distance (km)',
      dataIndex: 'distance_meters',
      render: (v: number) => v ? (v / 1000).toFixed(2) : '-',
    },
    {
      title: 'Duration',
      dataIndex: 'duration_seconds',
      render: formatDuration,
    },
    {
      title: 'Pace',
      dataIndex: 'avg_pace_seconds_per_km',
      render: formatPace,
    },
    ...(tab === 'flagged'
      ? [
          { title: 'Course', dataIndex: 'course_title', render: (v: string) => v || '-' },
          {
            title: 'Flag',
            dataIndex: 'flag_reason',
            render: (v: string) => <Tag color="red">{v}</Tag>,
          },
        ]
      : [
          {
            title: 'Flagged',
            dataIndex: 'is_flagged',
            render: (v: boolean) => v ? <Tag color="red">Flagged</Tag> : null,
          },
        ]),
    {
      title: 'Date',
      dataIndex: 'created_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Action',
      render: (_: any, record: any) => (
        <Space>
          {record.is_flagged && (
            <Button size="small" icon={<CheckCircleOutlined />} onClick={() => unflagMutation.mutate(record.id)}>
              Unflag
            </Button>
          )}
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>Run Records</Title>
      <Tabs
        activeKey={tab}
        onChange={(k) => { setTab(k as any); setPage(1); }}
        items={[
          { key: 'flagged', label: 'Flagged Runs' },
          { key: 'all', label: 'All Runs' },
        ]}
      />
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        pagination={{
          current: page,
          total: data?.total ?? 0,
          pageSize: 20,
          onChange: setPage,
          showTotal: (total) => `${total} runs`,
        }}
      />
    </div>
  );
}
