import { useState } from 'react';
import {
  Card, Tabs, Button, Modal, Input, Checkbox, Tag, Space, Typography, message, Popconfirm, List, Segmented, Spin, Empty,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, MessageOutlined, DesktopOutlined, DatabaseOutlined, RocketOutlined,
  MobileOutlined, SettingOutlined,
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

const scopeMeta: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  app: { color: 'purple', label: '앱', icon: <MobileOutlined /> },
  admin: { color: 'cyan', label: '어드민', icon: <SettingOutlined /> },
};

function groupByDate(items: any[]): { date: string; items: any[] }[] {
  const map = new Map<string, any[]>();
  for (const item of items) {
    const date = dayjs(item.created_at).format('YYYY-MM-DD');
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(item);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

function formatDateLabel(date: string): string {
  const d = dayjs(date);
  const today = dayjs().format('YYYY-MM-DD');
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[d.day()];
  if (date === today) return `오늘 (${d.format('M월 D일')} ${weekday}요일)`;
  if (date === yesterday) return `어제 (${d.format('M월 D일')} ${weekday}요일)`;
  return `${d.format('YYYY년 M월 D일')} ${weekday}요일`;
}

export default function ChangelogPage() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('');
  const [scope, setScope] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState<{ id: string; title: string } | null>(null);
  const [newComment, setNewComment] = useState('');

  const [form, setForm] = useState({ categories: ['feature'] as string[], scope: 'app', title: '', description: '', version: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['changelogs', category, scope, page],
    queryFn: () => api.get('/admin-api/changelogs', { params: { category, scope, page, limit: 50 } }).then(r => r.data),
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
      setForm({ categories: ['feature'], scope: 'app', title: '', description: '', version: '' });
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

  const dateGroups = groupByDate(data?.items ?? []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>변경 로그</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          추가
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <Segmented
          value={scope}
          onChange={(v) => { setScope(v as string); setPage(1); }}
          options={[
            { value: '', label: '전체' },
            { value: 'app', label: '앱' },
            { value: 'admin', label: '어드민' },
          ]}
        />
        <Tabs
          activeKey={category}
          onChange={(k) => { setCategory(k); setPage(1); }}
          items={CATEGORIES.map((c) => ({
            key: c.key,
            label: <span>{c.icon} {c.label}</span>,
          }))}
          style={{ marginBottom: 0 }}
        />
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>
      ) : dateGroups.length === 0 ? (
        <Empty description="변경 로그가 없습니다" />
      ) : (
        <>
          {dateGroups.map(({ date, items }) => (
            <div key={date} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Text strong style={{ fontSize: 15 }}>{formatDateLabel(date)}</Text>
                <Tag>{items.length}건</Tag>
              </div>
              <div style={{ borderLeft: '2px solid #303030', paddingLeft: 16 }}>
                {items.map((item: any) => {
                  const cats: string[] = item.categories || [];
                  const sc = scopeMeta[item.scope] || scopeMeta.app;
                  return (
                    <Card size="small" key={item.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <Space style={{ marginBottom: 4 }} wrap>
                            <Tag color={sc.color} icon={sc.icon}>{sc.label}</Tag>
                            {cats.map((cat) => {
                              const meta = categoryMeta[cat] || { color: 'default', label: cat };
                              return <Tag key={cat} color={meta.color}>{meta.label}</Tag>;
                            })}
                            <Text strong>{item.title}</Text>
                            {item.version && <Tag>{item.version}</Tag>}
                          </Space>
                          {item.description && (
                            <Paragraph style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{item.description}</Paragraph>
                          )}
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {item.author} · {dayjs(item.created_at).format('HH:mm')}
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
                })}
              </div>
            </div>
          ))}
          {data?.total > 50 && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button onClick={() => setPage(p => p + 1)}>더 보기</Button>
            </div>
          )}
        </>
      )}

      {/* 생성 모달 */}
      <Modal
        title="변경 사항 추가"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => {
          if (!form.categories.length) { message.warning('분류를 하나 이상 선택해주세요.'); return; }
          if (!form.title.trim()) { message.warning('제목을 입력해주세요.'); return; }
          createMutation.mutate(form);
        }}
        okText="추가"
        cancelText="취소"
        okButtonProps={{ loading: createMutation.isPending }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <Text strong>대상</Text>
            <div style={{ marginTop: 8 }}>
              <Segmented
                value={form.scope}
                onChange={(v) => setForm({ ...form, scope: v as string })}
                options={[
                  { value: 'app', label: '앱' },
                  { value: 'admin', label: '어드민' },
                ]}
              />
            </div>
          </div>
          <div>
            <Text strong>분류 (복수 선택 가능)</Text>
            <div style={{ marginTop: 8 }}>
              <Checkbox.Group
                value={form.categories}
                onChange={(v) => setForm({ ...form, categories: v as string[] })}
                options={[
                  { value: 'feature', label: '기능 변경' },
                  { value: 'ui', label: 'UI 변경' },
                  { value: 'db', label: 'DB 변경' },
                ]}
              />
            </div>
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
        width="90%"
        style={{ maxWidth: 600 }}
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
