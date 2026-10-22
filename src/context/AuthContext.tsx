import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'player';
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, pass: string) => Promise<AuthUser>;
  quickLoginAdmin: () => Promise<AuthUser>;
  quickLoginPlayer: (username?: string) => Promise<AuthUser>;
  register: (username: string, email: string, name: string, pass: string) => Promise<AuthUser>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('cb_token');
    if (token) {
      api.setToken(token);
      api.getMe()
        .then((res) => {
          setUser(res.user);
        })
        .catch(() => {
          api.setToken(null);
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, pass: string): Promise<AuthUser> => {
    const res = await api.login(username, pass);
    api.setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  // Quick 1-click login as requested Admin BLACKDRAGON
  const quickLoginAdmin = async (): Promise<AuthUser> => {
    return login('BLACKDRAGON', 'BLACKDRAGON9025');
  };

  // Quick login as a pre-seeded contestant
  const quickLoginPlayer = async (username: string = 'alex_coder'): Promise<AuthUser> => {
    return login(username, 'Player123!');
  };

  const register = async (username: string, email: string, name: string, pass: string): Promise<AuthUser> => {
    const res = await api.register(username, email, name, pass);
    api.setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        quickLoginAdmin,
        quickLoginPlayer,
        register,
        logout,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
