import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('wind_auth_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('wind_auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Validate stored token on mount
  useEffect(() => {
    async function verifyAuth() {
      const storedToken = localStorage.getItem('wind_auth_token');
      if (storedToken) {
        try {
          const freshUser = await authService.getMe();
          setUser(freshUser);
          localStorage.setItem('wind_auth_user', JSON.stringify(freshUser));
        } catch (err) {
          console.warn('Stored token is invalid or expired:', err);
          localStorage.removeItem('wind_auth_token');
          localStorage.removeItem('wind_auth_user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    verifyAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    const accessToken = data.access_token;
    const userData = data.user;

    localStorage.setItem('wind_auth_token', accessToken);
    localStorage.setItem('wind_auth_user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
    return userData;
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const registeredUser = await authService.signup(name, email, password);
    // After signup, automatically login or return registered user
    return registeredUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('wind_auth_token');
    localStorage.removeItem('wind_auth_user');
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await authService.getMe();
      setUser(freshUser);
      localStorage.setItem('wind_auth_user', JSON.stringify(freshUser));
      return freshUser;
    } catch (err) {
      logout();
      throw err;
    }
  }, [logout]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
