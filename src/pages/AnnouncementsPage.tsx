import { useState } from 'react';
import { Table, Button, Tag, Modal, Form, Input, message, Typography, Space, Switch } from 'antd';
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
    onSuccess: () => { message.success('Created'); closeModal(); queryClient.invalidateQueries({ queryKey: ['announcements'] }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...values }: any) => api.patch(`/admin-api/announcements/${id}`, values),
    onSuccess: () => { message.success('Updated'); closeModal(); queryClient.invalidateQueries({ queryKey: ['announcements'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin-api/announcements/${id}`),
    onSuccess: () => { message.success('Deleted'); queryClient.invalidateQueries({ queryKey: ['announcements'] }); },
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
    { title: 'Title', dataIndex: 'title', ellipsis: true },
    {
      title: 'Active',
      dataIndex: 'is_active',
      render: (v: boolean, record: any) => (
        <Switch
          checked={v}
          size="small"
          onChange={(checked) => updateMutation.mutate({ id: record.id, is_active: checked })}
        />
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Action',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>Edit</Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => Modal.confirm({ title: 'Delete?', onOk: () => deleteMutation.mutateAsync(record.id) })}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4}>Announcements</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New</Button>
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
        }}
      />
      <Modal
        title={editing ? 'Edit Announcement' : 'New Announcement'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={closeModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="Content" rules={[{ required: true }]}>
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
