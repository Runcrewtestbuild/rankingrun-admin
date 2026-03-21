import { useState } from 'react';
import { Table, Input, Button, Tag, Modal, message, Typography, Space } from 'antd';
import { SearchOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../api';

const { Title } = Typography;

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => api.get('/admin-api/users', { params: { page, limit: 20, search } }).then(r => r.data),
  });

  const banMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/admin-api/users/${userId}/ban`, { reason: 'Admin action' }),
    onSuccess: () => { message.success('User banned'); queryClient.invalidateQueries({ queryKey: ['users'] }); },
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/admin-api/users/${userId}/unban`),
    onSuccess: () => { message.success('User unbanned'); queryClient.invalidateQueries({ queryKey: ['users'] }); },
  });

  const handleBan = (userId: string, nickname: string) => {
    Modal.confirm({
      title: `Ban "${nickname}"?`,
      onOk: () => banMutation.mutateAsync(userId),
    });
  };

  const columns = [
    { title: 'Code', dataIndex: 'user_code', width: 100 },
    { title: 'Nickname', dataIndex: 'nickname' },
    { title: 'Email', dataIndex: 'email', ellipsis: true },
    {
      title: 'Runs',
      dataIndex: 'total_runs',
      sorter: (a: any, b: any) => a.total_runs - b.total_runs,
    },
    {
      title: 'Distance (km)',
      dataIndex: 'total_distance_meters',
      render: (v: number) => v ? (v / 1000).toFixed(1) : '0',
    },
    { title: 'Level', dataIndex: 'runner_level' },
    {
      title: 'Status',
      dataIndex: 'is_banned',
      render: (banned: boolean) =>
        banned ? <Tag color="red">Banned</Tag> : <Tag color="green">Active</Tag>,
    },
    {
      title: 'Joined',
      dataIndex: 'created_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
    },
    {
      title: 'Action',
      render: (_: any, record: any) => (
        <Space>
          {record.is_banned ? (
            <Button size="small" icon={<CheckCircleOutlined />} onClick={() => unbanMutation.mutate(record.id)}>
              Unban
            </Button>
          ) : (
            <Button size="small" danger icon={<StopOutlined />} onClick={() => handleBan(record.id, record.nickname)}>
              Ban
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4}>Users</Title>
        <Input
          placeholder="Search by nickname, email, code"
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
          showTotal: (total) => `${total} users`,
        }}
      />
    </div>
  );
}
