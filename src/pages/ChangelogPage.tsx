import { useState } from 'react';
import {
  Card, Tabs, List, Button, Modal, Input, Select, Tag, Space, Typography, message, Popconfirm,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, MessageOutlined, DesktopOutlined, DatabaseOutlined, RocketOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const CATEGORIES = [
  { key: '', label: '전체', icon: null },
  { key: 'feature', label: '기능', icon: <RocketOutlined />, color: 'blue' },
  { key: 'ui', label: 'UI', icon: <DesktopOutlined />, color: 'green' },
  { key: 'db', label: 'DB', icon: <DatabaseOutlined />, color: 'orange' },
];

const categoryMeta: Record<string, { color: string; label: string }> = {
  feature: { color: 'blue', label: '기능' },
  ui: { color: 'green', label: 'UI' },
  db: { color: 'orange', label: 'DB' },
};

export default function ChangelogPage() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState<{ id: string; title: string } | null>(null);
  const [newComment, setNewComment] = useState('');

  // Create form
  const [form, setForm] = useState({ category: 'feature', title: '', description: '', version: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['changelogs', category, page],
    queryFn: () => api.get('/admin-api/changelogs', { params: { category, page, limit: 20 } }).then(r => r.data),
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['changelog-comments', commentOpen?.id],
    queryFn: () => api.get(`/admin-api/changelogs/${commentOpen!.id}/comments`).then(r => r.data),
    enabled: !!commentOpen,
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post('/admin-api/changelogs', body),
    onSuccess: () => {
      message.success('변경 로그가 추가되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['changelogs'] });
      setCreateOpen(false);
      setForm({ category: 'feature', title: '', description: '', version: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin-api/changelogs/${id}`),
    onSuccess: () => {
      message.success('삭제 완료');
      queryClient.invalidateQueries({ queryKey: ['changelogs'] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api.post(`/admin-api/changelogs/${id}/comments`, { content }),
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['changelog-comments'] });
      queryClient.invalidateQueries({ queryKey: ['changelogs'] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: ({ changelogId, commentId }: { changelogId: string; commentId: string }) =>
      api.delete(`/admin-api/changelogs/${changelogId}/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelog-comments'] });
      queryClient.invalidateQueries({ queryKey: ['changelogs'] });
    },
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4}>변경 로그</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          변경 사항 추가
        </Button>
      </div>

      <Tabs
        activeKey={category}
        onChange={(k) => { setCategory(k); setPage(1); }}
        items={CATEGORIES.map((c) => ({
          key: c.key,
          label: (
            <span>{c.icon} {c.label}</span>
          ),
        }))}
      />

      <List
        loading={isLoading}
        dataSource={data?.items ?? []}
        locale={{ emptyText: '변경 로그가 없습니다' }}
        pagination={data?.total > 20 ? {
          current: page,
          total: data?.total ?? 0,
          pageSize: 20,
          onChange: setPage,
          size: 'small',
          showTotal: (total: number) => `총 ${total}건`,
        } : false}
        renderItem={(item: any) => {
          const meta = categoryMeta[item.category] || { color: 'default', label: item.category };
          return (
            <Card size="small" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <Space style={{ marginBottom: 4 }}>
                    <Tag color={meta.color}>{meta.label}</Tag>
                    <Text strong>{item.title}</Text>
                    {item.version && <Tag>{item.version}</Tag>}
                  </Space>
                  {item.description && (
                    <Paragraph style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{item.description}</Paragraph>
                  )}
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.author} · {dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </div>
                </div>
                <Space>
                  <Button
                    size="small"
                    icon={<MessageOutlined />}
                    onClick={() => setCommentOpen({ id: item.id, title: item.title })}
                  >
                    {item.comment_count || 0}
                  </Button>
                  <Popconfirm
                    title="이 변경 로그를 삭제하시겠습니까?"
                    onConfirm={() => deleteMutation.mutate(item.id)}
                    okText="삭제"
                    cancelText="취소"
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
            </Card>
          );
        }}
      />

      {/* 생성 모달 */}
      <Modal
        title="변경 사항 추가"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => {
          if (!form.title.trim()) { message.warning('제목을 입력해주세요.'); return; }
          createMutation.mutate(form);
        }}
        okText="추가"
        cancelText="취소"
        okButtonProps={{ loading: createMutation.isPending }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <Text strong>분류</Text>
            <Select
              value={form.category}
              onChange={(v) => setForm({ ...form, category: v })}
              style={{ width: '100%', marginTop: 4 }}
              options={[
                { value: 'feature', label: '기능 변경' },
                { value: 'ui', label: 'UI 변경' },
                { value: 'db', label: 'DB 변경' },
              ]}
            />
          </div>
          <div>
            <Text strong>제목</Text>
            <Input
              placeholder="변경 사항 제목"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Text strong>설명 (선택)</Text>
            <TextArea
              placeholder="상세 내용"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Text strong>버전 (선택)</Text>
            <Input
              placeholder="예: v1.2.0"
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
              style={{ marginTop: 4 }}
            />
          </div>
        </Space>
      </Modal>

      {/* 코멘트 모달 */}
      <Modal
        title={`코멘트 - ${commentOpen?.title ?? ''}`}
        open={!!commentOpen}
        onCancel={() => { setCommentOpen(null); setNewComment(''); }}
        footer={null}
        width={600}
      >
        <List
          loading={commentsLoading}
          dataSource={comments ?? []}
          locale={{ emptyText: '코멘트가 없습니다' }}
          renderItem={(c: any) => (
            <List.Item
              actions={[
                <Popconfirm
                  title="삭제하시겠습니까?"
                  onConfirm={() => deleteCommentMutation.mutate({ changelogId: commentOpen!.id, commentId: c.id })}
                  okText="삭제"
                  cancelText="취소"
                >
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={<Text strong>{c.author}</Text>}
                description={
                  <div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{c.content}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(c.created_at).format('YYYY-MM-DD HH:mm')}</Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <TextArea
            placeholder="코멘트 작성..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            onClick={() => {
              if (!newComment.trim()) return;
              addCommentMutation.mutate({ id: commentOpen!.id, content: newComment });
            }}
            loading={addCommentMutation.isPending}
            style={{ alignSelf: 'flex-end' }}
          >
            등록
          </Button>
        </div>
      </Modal>
    </div>
  );
}
