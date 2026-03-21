import { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
}

export default function LoginPage({ onLogin }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await onLogin(values.email, values.password);
    } catch {
      message.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0a0a0a',
      }}
    >
      <Card style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3}>RUNVS Admin</Title>
        </div>
        <Form onFinish={handleSubmit} layout="vertical" size="large">
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Email required' }]}>
            <Input prefix={<MailOutlined />} placeholder="Email" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Password required' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Login
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
