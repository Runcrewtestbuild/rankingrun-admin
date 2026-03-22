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
      message.error('로그인에 실패했습니다');
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
      <Card style={{ width: 400, maxWidth: 'calc(100vw - 32px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3}>RUNVS 관리자</Title>
        </div>
        <Form onFinish={handleSubmit} layout="vertical" size="large">
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: '이메일을 입력하세요' }]}>
            <Input prefix={<MailOutlined />} placeholder="이메일" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '비밀번호를 입력하세요' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              로그인
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
