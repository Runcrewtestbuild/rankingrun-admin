import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Typography, Space, Tag, Rate, Modal, message } from 'antd';
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../api';

const { Title, Paragraph } = Typography;

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', page, search],
    queryFn: () => api.get('/admin-api/reviews', { params: { page, limit: 20, search } }).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin-api/reviews/${id}`),
    onSuccess: () => { message.success('리뷰 삭제 완료'); queryClient.invalidateQueries({ queryKey: ['reviews'] }); },
  });

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '이 리뷰를 삭제하시겠습니까?',
      okText: '삭제',
      cancelText: '취소',
      onOk: () => deleteMutation.mutateAsync(id),
    });
  };

  const columns = [
    {
      title: '작성자',
      width: 100,
      render: (_: any, record: any) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/users/${record.user_id}`)}>
          {record.nickname}
        </Button>
      ),
    },
    { title: '코드', dataIndex: 'user_code', width: 85 },
    {
      title: '코스',
      width: 120,
      ellipsis: true,
      render: (_: any, record: any) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/courses/${record.course_id}`)}>
          {record.course_title}
        </Button>
      ),
    },
    {
      title: '평점',
      dataIndex: 'rating',
      width: 130,
      render: (v: number) => <Rate disabled value={v} style={{ fontSize: 14 }} />,
    },
    {
      title: '내용',
      dataIndex: 'content',
      ellipsis: true,
      render: (v: string) => v || <span style={{ color: '#666' }}>내용 없음</span>,
    },
    {
      title: '코스 작성자 답변',
      dataIndex: 'creator_reply',
      width: 150,
      ellipsis: true,
      render: (v: string) => v ? <Tag color="blue">답변 있음</Tag> : '-',
    },
    {
      title: '일시',
      dataIndex: 'created_at',
      width: 130,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '',
      width: 50,
      render: (_: any, record: any) => (
        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>리뷰 관리</Title>
        <Input.Search
          placeholder="리뷰 내용, 닉네임, 코스명 검색"
          allowClear
          onSearch={(v) => { setSearch(v); setPage(1); }}
          style={{ width: 280, maxWidth: '100%' }}
        />
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        size="small"
        scroll={{ x: 900 }}
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
