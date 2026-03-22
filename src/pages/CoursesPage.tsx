import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Input, Button, Tag, Modal, message, Typography, Space } from 'antd';
import { SearchOutlined, EyeOutlined, EyeInvisibleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../api';

const { Title } = Typography;

const difficultyLabel: Record<string, { color: string; text: string }> = {
  easy: { color: 'green', text: '쉬움' },
  moderate: { color: 'blue', text: '보통' },
  hard: { color: 'orange', text: '어려움' },
  extreme: { color: 'red', text: '극한' },
};

export default function CoursesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['courses', page, search],
    queryFn: () => api.get('/admin-api/courses', { params: { page, limit: 20, search } }).then(r => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin-api/courses/${id}/toggle-public`),
    onSuccess: () => { message.success('변경 완료'); queryClient.invalidateQueries({ queryKey: ['courses'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin-api/courses/${id}`),
    onSuccess: () => { message.success('삭제 완료'); queryClient.invalidateQueries({ queryKey: ['courses'] }); },
  });

  const handleDelete = (id: string, title: string) => {
    Modal.confirm({
      title: `"${title}" 코스를 삭제하시겠습니까?`,
      content: '관련 랭킹과 통계도 함께 삭제됩니다.',
      okText: '삭제',
      cancelText: '취소',
      onOk: () => deleteMutation.mutateAsync(id),
    });
  };

  const columns = [
    {
      title: '코스명',
      dataIndex: 'title',
      ellipsis: true,
      width: 160,
      render: (v: string, record: any) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/courses/${record.id}`)}>{v}</Button>
      ),
    },
    {
      title: '거리 (km)',
      dataIndex: 'distance_meters',
      width: 100,
      render: (v: number) => v ? (v / 1000).toFixed(1) : '-',
      sorter: (a: any, b: any) => (a.distance_meters ?? 0) - (b.distance_meters ?? 0),
    },
    {
      title: '난이도',
      dataIndex: 'difficulty',
      width: 90,
      render: (v: string) => {
        const d = difficultyLabel[v];
        return d ? <Tag color={d.color}>{d.text}</Tag> : '-';
      },
    },
    { title: '생성자', dataIndex: 'creator_nickname', width: 100 },
    { title: '런 횟수', dataIndex: 'total_runs', width: 80, render: (v: number) => v ?? 0 },
    { title: '러너 수', dataIndex: 'unique_runners', width: 80, render: (v: number) => v ?? 0 },
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
      width: 140,
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            icon={record.is_public ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => toggleMutation.mutate(record.id)}
          >
            {record.is_public ? '숨기기' : '공개'}
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id, record.title)}>
            삭제
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>코스 관리</Title>
        <Input
          placeholder="코스명으로 검색"
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
        scroll={{ x: 950 }}
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
