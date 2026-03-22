import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Tabs, Typography, Button, Space } from 'antd';
import { EyeOutlined, CalendarOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../api';

const { Title } = Typography;

export default function EventsPage() {
  const [tab, setTab] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['events', tab, page],
    queryFn: () => api.get('/admin-api/events', { params: { status: tab, page, limit: 20 } }).then(r => r.data),
  });

  const columns = [
    {
      title: '제목',
      dataIndex: 'title',
      ellipsis: true,
      render: (v: string, record: any) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/events/${record.id}`)}>{v}</Button>
      ),
    },
    {
      title: '유형',
      dataIndex: 'event_type',
      width: 90,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '상태',
      width: 80,
      render: (_: any, record: any) => {
        const now = dayjs();
        const ended = record.ends_at && dayjs(record.ends_at).isBefore(now);
        if (!record.is_active) return <Tag>비활성</Tag>;
        if (ended) return <Tag color="default">종료</Tag>;
        return <Tag color="green">진행중</Tag>;
      },
    },
    { title: '코스', dataIndex: 'course_title', width: 120, ellipsis: true, render: (v: string) => v || '-' },
    { title: '참가자', dataIndex: 'participant_count', width: 70, render: (v: number, r: any) => r.max_participants ? `${v}/${r.max_participants}` : v },
    {
      title: '기간',
      width: 180,
      render: (_: any, record: any) => (
        <span style={{ fontSize: 12 }}>
          {record.starts_at ? dayjs(record.starts_at).format('MM-DD HH:mm') : '?'}
          {' ~ '}
          {record.ends_at ? dayjs(record.ends_at).format('MM-DD HH:mm') : '무기한'}
        </span>
      ),
    },
    {
      title: '',
      width: 50,
      render: (_: any, record: any) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/events/${record.id}`)} />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>이벤트</Title>
      </div>
      <Tabs
        activeKey={tab}
        onChange={(k) => { setTab(k); setPage(1); }}
        items={[
          { key: '', label: '전체' },
          { key: 'active', label: '진행중' },
          { key: 'ended', label: '종료' },
        ]}
      />
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.items ?? []}
        loading={isLoading}
        size="small"
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
