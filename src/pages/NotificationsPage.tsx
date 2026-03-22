import { useState } from 'react';
import { Card, Button, Input, Typography, Space, Table, Tag, Statistic, message, Modal, Tabs } from 'antd';
import { SendOutlined, MobileOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../api';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function NotificationsPage() {
  const [tab, setTab] = useState('send');
  const [historyPage, setHistoryPage] = useState(1);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetUserIds, setTargetUserIds] = useState('');
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['notification-stats'],
    queryFn: () => api.get('/admin-api/notifications/stats').then(r => r.data),
  });

  const { data: deviceStats } = useQuery({
    queryKey: ['device-stats'],
    queryFn: () => api.get('/admin-api/notifications/device-stats').then(r => r.data),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['notification-history', historyPage],
    queryFn: () => api.get('/admin-api/notifications/history', { params: { page: historyPage, limit: 20 } }).then(r => r.data),
    enabled: tab === 'history',
  });

  const sendMutation = useMutation({
    mutationFn: (payload: { title: string; message: string; user_ids?: string[] }) =>
      api.post('/admin-api/notifications/send', payload),
    onSuccess: (res) => {
      message.success(`${res.data.sent_count}명에게 알림 발송 완료`);
      setTitle('');
      setBody('');
      setTargetUserIds('');
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      queryClient.invalidateQueries({ queryKey: ['notification-history'] });
    },
  });

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      message.warning('제목과 내용을 입력해주세요.');
      return;
    }

    const userIds = targetUserIds.trim()
      ? targetUserIds.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
      : undefined;

    const target = userIds ? `${userIds.length}명` : '전체 유저';

    Modal.confirm({
      title: `${target}에게 알림을 발송하시겠습니까?`,
      content: (
        <div>
          <div><Text strong>제목:</Text> {title}</div>
          <div><Text strong>내용:</Text> {body}</div>
        </div>
      ),
      okText: '발송',
      cancelText: '취소',
      onOk: () => sendMutation.mutateAsync({
        title,
        message: body,
        user_ids: userIds,
      }),
    });
  };

  const historyColumns = [
    { title: '수신자', dataIndex: 'nickname', width: 100 },
    { title: '코드', dataIndex: 'user_code', width: 85 },
    {
      title: '제목',
      width: 150,
      ellipsis: true,
      render: (_: any, record: any) => {
        const d = record.data;
        return d?.title || '-';
      },
    },
    {
      title: '내용',
      ellipsis: true,
      render: (_: any, record: any) => {
        const d = record.data;
        return d?.message || '-';
      },
    },
    {
      title: '읽음',
      dataIndex: 'is_read',
      width: 70,
      render: (v: boolean) => v ? <Tag color="green">읽음</Tag> : <Tag>안읽음</Tag>,
    },
    {
      title: '발송일',
      dataIndex: 'created_at',
      width: 130,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>알림 관리</Title>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        {stats && (
          <Card size="small" style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <Statistic title="총 알림" value={stats.total} />
              <Statistic title="읽음" value={stats.read_count} />
              <Statistic title="안읽음" value={stats.unread_count} />
              <Statistic title="관리자 알림" value={stats.admin_notices} />
            </div>
          </Card>
        )}
        {deviceStats && deviceStats.length > 0 && (
          <Card size="small" title={<><MobileOutlined /> 디바이스</>} style={{ minWidth: 200 }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {deviceStats.map((d: any) => (
                <Statistic key={d.platform} title={d.platform.toUpperCase()} value={d.unique_users} suffix="명" />
              ))}
            </div>
          </Card>
        )}
      </div>

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'send', label: '알림 발송' },
          { key: 'history', label: '발송 이력' },
        ]}
      />

      {tab === 'send' && (
        <Card size="small">
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <div>
              <Text strong>제목</Text>
              <Input
                placeholder="알림 제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                style={{ marginTop: 4 }}
              />
            </div>
            <div>
              <Text strong>내용</Text>
              <TextArea
                placeholder="알림 내용"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                maxLength={500}
                showCount
                style={{ marginTop: 4 }}
              />
            </div>
            <div>
              <Text strong>대상 유저 ID (선택)</Text>
              <TextArea
                placeholder="비워두면 전체 발송. 특정 유저에게만 발송하려면 유저 ID를 줄바꿈 또는 콤마로 구분하여 입력"
                value={targetUserIds}
                onChange={(e) => setTargetUserIds(e.target.value)}
                rows={2}
                style={{ marginTop: 4 }}
              />
            </div>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={sendMutation.isPending}
            >
              발송
            </Button>
          </Space>
        </Card>
      )}

      {tab === 'history' && (
        <Table
          rowKey="id"
          columns={historyColumns}
          dataSource={history?.items ?? []}
          loading={historyLoading}
          size="small"
          scroll={{ x: 700 }}
          pagination={{
            current: historyPage,
            total: history?.total ?? 0,
            pageSize: 20,
            onChange: setHistoryPage,
            showTotal: (total) => `총 ${total}건`,
          }}
        />
      )}
    </div>
  );
}
