import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Input, Button, Tag, Modal, message, Typography, Space } from 'antd';
import { SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../api';

const { Title } = Typography;

export default function CrewsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['crews', page, search],
    queryFn: () => api.get('/admin-api/crews', { params: { page, limit: 20, search } }).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin-api/crews/${id}`),
    onSuccess: () => { message.success('삭제 완료'); queryClient.invalidateQueries({ queryKey: ['crews'] }); },
  });

  const handleDelete = (id: string, name: string) => {
    Modal.confirm({
      title: `"${name}" 크루를 삭제하시겠습니까?`,
      content: '크루 멤버 정보도 함께 삭제됩니다.',
      okText: '삭제',
      cancelText: '취소',
      onOk: () => deleteMutation.mutateAsync(id),
    });
  };

  const columns = [
    {
      title: '크루명',
      dataIndex: 'name',
      width: 150,
      render: (v: string, record: any) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/crews/${record.id}`)}>{v}</Button>
      ),
    },
    { title: '지역', dataIndex: 'region', width: 100, render: (v: string) => v || '-' },
    { title: '크루장', dataIndex: 'owner_nickname', width: 100 },
    {
      title: '멤버',
      dataIndex: 'member_count',
      width: 80,
      render: (v: number, record: any) =>
        record.max_members ? `${v}/${record.max_members}` : `${v}`,
    },
    { title: '레벨', dataIndex: 'level', width: 70 },
    {
      title: '공개',
      dataIndex: 'is_public',
      width: 80,
      render: (v: boolean) => v ? <Tag color="green">공개</Tag> : <Tag>비공개</Tag>,
    },
    {
      title: '생성일',
      dataIndex: 'created_at',
      width: 110,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
    },
    {
      title: '관리',
      width: 80,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id, record.name)}>
            삭제
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>크루 관리</Title>
        <Input
          placeholder="크루명으로 검색"
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
        scroll={{ x: 800 }}
        pagination={{
          current: page,
          total: data?.total ?? 0,
          pageSize: 20,
          onChange: setPage,
          showTotal: (total) => `총 ${total}개`,
        }}
      />
    </div>
  );
}
