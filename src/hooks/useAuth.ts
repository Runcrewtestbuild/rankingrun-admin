import { useState, useCallback, useEffect } from 'react';
import { api } from '../api';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
}

const TOKEN_KEY = 'runvs_admin_token';

export function useAuth() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/admin-api/auth/me')
      .then(res => setAdmin(res.data.admin))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/admin-api/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setAdmin(res.data.admin);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAdmin(null);
  }, []);

  return { admin, loading, login, logout, isAuthenticated: !!admin };
}
