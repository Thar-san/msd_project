import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { IUser, LoginInput, RegisterInput } from '@compilo/shared';
import { ApiClient } from '../services/api';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: IUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (data: LoginInput) => Promise<IUser>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  const refreshUser = useCallback(async () => {
    try {
      const data = await ApiClient.get<IUser>('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (input: LoginInput): Promise<IUser> => {
    try {
      const res = await ApiClient.post<{ user: IUser; token: string }>('/auth/login', input);
      setUser(res.user);
      success(`Welcome back, ${res.user.name}!`);
      return res.user;
    } catch (err: any) {
      error(err.message || 'Login failed. Please check credentials.');
      throw err;
    }
  };

  const register = async (input: RegisterInput) => {
    try {
      const res = await ApiClient.post<{ user: IUser; token: string }>('/auth/register', input);
      setUser(res.user);
      success('Account created successfully! Welcome to Nexora.');
    } catch (err: any) {
      error(err.message || 'Registration failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await ApiClient.post('/auth/logout');
    } catch {
      // Ignore
    } finally {
      setUser(null);
      success('Logged out successfully');
    }
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
