import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [sessionToken, setSessionToken] = useState(localStorage.getItem('session_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
        } catch (err) {
          console.error('Failed to load user profile:', err);
          logout();
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [token]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const { access_token, session_token, user: userData } = res.data;

    localStorage.setItem('auth_token', access_token);
    localStorage.setItem('session_token', session_token);
    setToken(access_token);
    setSessionToken(session_token);
    setUser(userData);
    return userData;
  };

  const register = async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password });
    return res.data;
  };

  const updateConsent = async (consentGiven) => {
    const res = await api.post('/auth/consent', { consent_given: consentGiven });
    setUser(res.data);
    return res.data;
  };

  const updateUserProfile = (updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (e) {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('session_token');
      setToken(null);
      setSessionToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        sessionToken,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        updateConsent,
        updateUserProfile,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
