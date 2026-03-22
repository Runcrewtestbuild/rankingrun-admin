import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Input, Button, Tag, Modal, message, Typography, Space } from 'antd';
import { SearchOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../api';

const { Title } = Typography;

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => api.get('/admin-api/users', { params: { page, limit: 20, search } }).then(r => r.data),
  });

  const banMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/admin-api/users/${userId}/ban`, { reason: 'Admin action' }),
    onSuccess: () => { message.success('차단 완료'); queryClient.invalidateQueries({ queryKey: ['users'] }); },
  });

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/admin-api/users/${userId}/unban`),
    onSuccess: () => { message.success('차단 해제 완료'); queryClient.invalidateQueries({ queryKey: ['users'] }); },
  });

  const handleBan = (userId: string, nickname: string) => {
    Modal.confirm({
      title: `"${nickname}" 유저를 차단하시겠습니까?`,
      okText: '차단',
      cancelText: '취소',
      onOk: () => banMutation.mutateAsync(userId),
    });
  };

  const columns = [
    { title: '코드', dataIndex: 'user_code', width: 100 },
    {
      title: '닉네임',
      dataIndex: 'nickname',
      width: 120,
      render: (v: string, record: any) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/users/${record.id}`)}>{v || '-'}</Button>
      ),
    },
    { title: '이메일', dataIndex: 'email', ellipsis: true, width: 180 },
    {
      title: '런 횟수',
      dataIndex: 'total_runs',
      width: 90,
      sorter: (a: any, b: any) => a.total_runs - b.total_runs,
    },
    {
      title: '거리 (km)',
      dataIndex: 'total_distance_meters',
      width: 100,
      render: (v: number) => v ? (v / 1000).toFixed(1) : '0',
    },
    { title: '레벨', dataIndex: 'runner_level', width: 70 },
    {
      title: '상태',
      dataIndex: 'is_banned',
      width: 80,
      render: (banned: boolean) =>
        banned ? <Tag color="red">차단</Tag> : <Tag color="green">정상</Tag>,
    },
    {
      title: '가입일',
      dataIndex: 'created_at',
      width: 110,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
    },
    {
      title: '관리',
      width: 100,
      render: (_: any, record: any) => (
        <Space>
          {record.is_banned ? (
            <Button size="small" icon={<CheckCircleOutlined />} onClick={() => unbanMutation.mutate(record.id)}>
              해제
            </Button>
          ) : (
            <Button size="small" danger icon={<StopOutlined />} onClick={() => handleBan(record.id, record.nickname)}>
              차단
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>유저 관리</Title>
        <Input
          placeholder="닉네임, 이메일, 코드로 검색"
          prefix={<SearchOutlined />}
          style={{ width: 300, maxWidth: '100%' }}
          allowClear
          onPressEnter={(e) => { setSearch((e.target as HTMLInputElement).value); setPage(1); }}
        />
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          total: data?.total ?? 0,
          pageSize: 20,
          onChange: setPage,
          showTotal: (total) => `총 ${total}명`,
        }}
      />
    </div>
  );
}
