import { useState } from 'react';
import { Table, Input, Button, Tag, Modal, message, Typography, Space } from 'antd';
import { SearchOutlined, EyeOutlined, EyeInvisibleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../api';

const { Title } = Typography;

const difficultyColor: Record<string, string> = {
  easy: 'green',
  moderate: 'blue',
  hard: 'orange',
  extreme: 'red',
};

export default function CoursesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['courses', page, search],
    queryFn: () => api.get('/admin-api/courses', { params: { page, limit: 20, search } }).then(r => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin-api/courses/${id}/toggle-public`),
    onSuccess: () => { message.success('Updated'); queryClient.invalidateQueries({ queryKey: ['courses'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin-api/courses/${id}`),
    onSuccess: () => { message.success('Deleted'); queryClient.invalidateQueries({ queryKey: ['courses'] }); },
  });

  const handleDelete = (id: string, title: string) => {
    Modal.confirm({
      title: `Delete "${title}"?`,
      content: 'This will also delete associated rankings and stats.',
      onOk: () => deleteMutation.mutateAsync(id),
    });
  };

  const columns = [
    { title: 'Title', dataIndex: 'title', ellipsis: true },
    {
      title: 'Distance (km)',
      dataIndex: 'distance_meters',
      render: (v: number) => v ? (v / 1000).toFixed(1) : '-',
      sorter: (a: any, b: any) => a.distance_meters - b.distance_meters,
    },
    {
      title: 'Difficulty',
      dataIndex: 'difficulty',
      render: (v: string) => v ? <Tag color={difficultyColor[v] || 'default'}>{v}</Tag> : '-',
    },
    { title: 'Creator', dataIndex: 'creator_nickname' },
    { title: 'Runs', dataIndex: 'total_runs', render: (v: number) => v ?? 0 },
    { title: 'Runners', dataIndex: 'unique_runners', render: (v: number) => v ?? 0 },
    {
      title: 'Public',
      dataIndex: 'is_public',
      render: (v: boolean) => v ? <Tag color="green">Public</Tag> : <Tag>Private</Tag>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
    },
    {
      title: 'Action',
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            icon={record.is_public ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => toggleMutation.mutate(record.id)}
          >
            {record.is_public ? 'Hide' : 'Show'}
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id, record.title)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4}>Courses</Title>
        <Input
          placeholder="Search by title"
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          allowClear
          onPressEnter={(e) => { setSearch((e.target as HTMLInputElement).value); setPage(1); }}
        />
      </div>
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
          showTotal: (total) => `${total} courses`,
        }}
      />
    </div>
  );
}
