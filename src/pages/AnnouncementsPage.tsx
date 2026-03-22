import { useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Typography, Space, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../api';

const { Title } = Typography;
const { TextArea } = Input;

export default function AnnouncementsPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['announcements', page],
    queryFn: () => api.get('/admin-api/announcements', { params: { page, limit: 20 } }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => api.post('/admin-api/announcements', values),
    onSuccess: () => { message.success('생성 완료'); closeModal(); queryClient.invalidateQueries({ queryKey: ['announcements'] }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...values }: any) => api.patch(`/admin-api/announcements/${id}`, values),
    onSuccess: () => { message.success('수정 완료'); closeModal(); queryClient.invalidateQueries({ queryKey: ['announcements'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin-api/announcements/${id}`),
    onSuccess: () => { message.success('삭제 완료'); queryClient.invalidateQueries({ queryKey: ['announcements'] }); },
  });

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (record: any) => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); form.resetFields(); };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  const columns = [
    { title: '제목', dataIndex: 'title', ellipsis: true },
    {
      title: '활성',
      dataIndex: 'is_active',
      width: 80,
      render: (v: boolean, record: any) => (
        <Switch
          checked={v}
          size="small"
          onChange={(checked) => updateMutation.mutate({ id: record.id, is_active: checked })}
        />
      ),
    },
    {
      title: '생성일',
      dataIndex: 'created_at',
      width: 150,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '관리',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>수정</Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => Modal.confirm({
              title: '삭제하시겠습니까?',
              okText: '삭제',
              cancelText: '취소',
              onOk: () => deleteMutation.mutateAsync(record.id),
            })}
          >
            삭제
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>공지사항</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>새 공지</Button>
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
          showTotal: (total) => `총 ${total}개`,
        }}
      />
      <Modal
        title={editing ? '공지 수정' : '새 공지 작성'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={closeModal}
        okText={editing ? '수정' : '생성'}
        cancelText="취소"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="제목" rules={[{ required: true, message: '제목을 입력하세요' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="내용" rules={[{ required: true, message: '내용을 입력하세요' }]}>
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
