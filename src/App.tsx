import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './hooks/useAuth';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import CoursesPage from './pages/CoursesPage';
import RunsPage from './pages/RunsPage';
import CrewsPage from './pages/CrewsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';

export default function App() {
  const { admin, loading, login, logout, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={login} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AdminLayout admin={admin!} onLogout={logout} />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/runs" element={<RunsPage />} />
        <Route path="/crews" element={<CrewsPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
