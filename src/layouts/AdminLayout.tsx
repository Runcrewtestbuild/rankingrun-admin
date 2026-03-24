import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown, Typography, Drawer, Grid } from 'antd';
import {
  BugOutlined,
  DashboardOutlined,
  UserOutlined,
  EnvironmentOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  NotificationOutlined,
  CalendarOutlined,
  BellOutlined,
  HistoryOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

interface Props {
  admin: { name: string; email: string; role: string };
  onLogout: () => void;
}

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '대시보드' },
  { key: '/users', icon: <UserOutlined />, label: '유저' },
  { key: '/courses', icon: <EnvironmentOutlined />, label: '코스' },
  { key: '/runs', icon: <ThunderboltOutlined />, label: '런 기록' },
  { key: '/crews', icon: <TeamOutlined />, label: '크루' },
  { key: '/announcements', icon: <NotificationOutlined />, label: '공지사항' },
  { key: '/events', icon: <CalendarOutlined />, label: '이벤트' },
  { key: '/notifications', icon: <BellOutlined />, label: '알림' },
  { key: '/changelog', icon: <HistoryOutlined />, label: '변경 로그' },
  { key: '/errors', icon: <BugOutlined />, label: '에러 모니터링' },
];

export default function AdminLayout({ admin, onLogout }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // 모바일에서 페이지 이동 시 Drawer 닫기
  useEffect(() => {
    if (isMobile) setDrawerOpen(false);
  }, [location.pathname, isMobile]);

  const menuContent = (
    <>
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <Text strong style={{ color: '#fff', fontSize: isMobile ? 18 : (collapsed ? 14 : 18) }}>
          {!isMobile && collapsed ? 'RV' : 'RUNVS 관리자'}
        </Text>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isMobile ? (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={220}
          styles={{ body: { padding: 0, background: '#141414' } }}
          closable={false}
        >
          {menuContent}
        </Drawer>
      ) : (
        <Sider collapsible collapsed={collapsed} trigger={null} width={220}>
          {menuContent}
        </Sider>
      )}
      <Layout>
        <Header
          style={{
            padding: isMobile ? '0 12px' : '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#141414',
          }}
        >
          <Button
            type="text"
            icon={isMobile ? <MenuOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
            onClick={() => isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed)}
            style={{ color: '#fff' }}
          />
          <Dropdown
            menu={{
              items: [
                { key: 'role', label: admin.role, disabled: true },
                { type: 'divider' },
                { key: 'logout', icon: <LogoutOutlined />, label: '로그아웃', onClick: onLogout },
              ],
            }}
          >
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} size={isMobile ? 'small' : 'default'} />
              {!isMobile && <Text style={{ color: '#fff' }}>{admin.name}</Text>}
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: isMobile ? 8 : 24, padding: isMobile ? 12 : 24, background: '#1f1f1f', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}