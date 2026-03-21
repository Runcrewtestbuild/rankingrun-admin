import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Table, Button, Space, Spin, Typography, List, Modal, Image } from 'antd';
import { ArrowLeftOutlined, MessageOutlined, LikeOutlined, PictureOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../api';

const { Title, Text, Paragraph } = Typography;

export default function CrewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [postPage, setPostPage] = useState(1);
  const [commentModal, setCommentModal] = useState<{ postId: string; title: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['crew', id],
    queryFn: () => api.get(`/admin-api/crews/${id}`).then(r => r.data),
  });

  const { data: postsData, isLoading: postsLoading } = useQuery({
    queryKey: ['crew-posts', id, postPage],
    queryFn: () => api.get(`/admin-api/crews/${id}/posts`, { params: { page: postPage, limit: 10 } }).then(r => r.data),
    enabled: !!id,
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['crew-post-comments', commentModal?.postId],
    queryFn: () => api.get(`/admin-api/crews/${id}/posts/${commentModal!.postId}/comments`).then(r => r.data),
    enabled: !!commentModal,
  });

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!data) return null;

  const memberColumns = [
    { title: '닉네임', dataIndex: 'nickname', width: 120 },
    { title: '코드', dataIndex: 'user_code', width: 100 },
    {
      title: '역할',
      dataIndex: 'role',
      width: 90,
      render: (v: string) => {
        const roles: Record<string, { color: string; text: string }> = {
          owner: { color: 'gold', text: '크루장' },
          admin: { color: 'blue', text: '관리자' },
          member: { color: 'default', text: '멤버' },
        };
        const r = roles[v] || { color: 'default', text: v };
        return <Tag color={r.color}>{r.text}</Tag>;
      },
    },
    {
      title: '가입일',
      dataIndex: 'joined_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/crews')}>크루 목록</Button>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          {data.logo_url && <img src={data.logo_url} alt="" style={{ width: 48, height: 48, borderRadius: 8 }} />}
          <div>
            <Title level={4} style={{ margin: 0 }}>{data.name}</Title>
            {data.region && <span style={{ color: '#999' }}>{data.region}</span>}
          </div>
          <Space style={{ marginLeft: 'auto' }}>
            {data.is_public ? <Tag color="green">공개</Tag> : <Tag>비공개</Tag>}
            {data.requires_approval && <Tag color="orange">가입 승인 필요</Tag>}
          </Space>
        </div>

        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} bordered size="small">
          <Descriptions.Item label="크루장">{data.owner_nickname || '-'}</Descriptions.Item>
          <Descriptions.Item label="멤버 수">
            {data.member_count}{data.max_members ? ` / ${data.max_members}` : ''}명
          </Descriptions.Item>
          <Descriptions.Item label="레벨">{data.level}</Descriptions.Item>
          <Descriptions.Item label="총 XP">{data.total_xp?.toLocaleString() ?? 0}</Descriptions.Item>
          <Descriptions.Item label="뱃지 색상">
            <Space>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: data.badge_color, border: '1px solid #555' }} />
              {data.badge_color}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="뱃지 아이콘">{data.badge_icon || '-'}</Descriptions.Item>
          <Descriptions.Item label="정기 모임">{data.recurring_schedule || '-'}</Descriptions.Item>
          <Descriptions.Item label="모임 장소">{data.meeting_point || '-'}</Descriptions.Item>
          <Descriptions.Item label="생성일">{dayjs(data.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          {data.description && (
            <Descriptions.Item label="설명" span={3}>{data.description}</Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title={`멤버 (${data.members?.length ?? 0}명)`} size="small" style={{ marginBottom: 16 }}>
        <Table
          rowKey={(record: any) => `${record.nickname}-${record.user_code}`}
          columns={memberColumns}
          dataSource={data.members ?? []}
          pagination={false}
          size="small"
        />
      </Card>

      <Card
        title={`게시판 (${postsData?.total ?? 0}건)`}
        size="small"
        loading={postsLoading}
      >
        <List
          dataSource={postsData?.items ?? []}
          locale={{ emptyText: '게시글이 없습니다' }}
          pagination={postsData?.total > 10 ? {
            current: postPage,
            total: postsData?.total ?? 0,
            pageSize: 10,
            onChange: setPostPage,
            size: 'small',
          } : false}
          renderItem={(item: any) => (
            <List.Item
              actions={[
                <Space size={12}>
                  <span><LikeOutlined /> {item.like_count}</span>
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0 }}
                    icon={<MessageOutlined />}
                    onClick={() => setCommentModal({ postId: item.id, title: item.title || item.content.slice(0, 20) })}
                  >
                    {item.comment_count}
                  </Button>
                </Space>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{item.nickname}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.user_code}</Text>
                    <Tag>{item.post_type}</Tag>
                    {!item.is_active && <Tag color="red">비활성</Tag>}
                  </Space>
                }
                description={
                  <div>
                    {item.title && <div style={{ fontWeight: 500, marginBottom: 4 }}>{item.title}</div>}
                    <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 4 }}>{item.content}</Paragraph>
                    {(item.image_urls?.length > 0 || item.image_url) && (
                      <Space size={4} style={{ marginBottom: 4 }}>
                        <PictureOutlined />
                        <Image.PreviewGroup>
                          {(item.image_urls || [item.image_url]).filter(Boolean).map((url: string, i: number) => (
                            <Image key={i} src={url} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 4 }} />
                          ))}
                        </Image.PreviewGroup>
                      </Space>
                    )}
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(item.created_at).format('YYYY-MM-DD HH:mm')}</Text>
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      <Modal
        title={`댓글 - ${commentModal?.title ?? ''}`}
        open={!!commentModal}
        onCancel={() => setCommentModal(null)}
        footer={null}
        width={600}
      >
        <List
          loading={commentsLoading}
          dataSource={comments ?? []}
          locale={{ emptyText: '댓글이 없습니다' }}
          renderItem={(c: any) => (
            <List.Item>
              <List.Item.Meta
                title={<Space><Text strong>{c.nickname}</Text><Text type="secondary" style={{ fontSize: 12 }}>{c.user_code}</Text></Space>}
                description={
                  <div>
                    <div>{c.content}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(c.created_at).format('YYYY-MM-DD HH:mm')}</Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}
