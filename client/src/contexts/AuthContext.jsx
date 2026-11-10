import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('@CRM_Token');
      if (token) {
        try {
          const userData = await api.auth.getMe();
          setUser(userData);
        } catch (error) {
          localStorage.removeItem('@CRM_Token');
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (email, password) => {
    const { token, user: userData } = await api.auth.login(email, password);
    localStorage.setItem('@CRM_Token', token);
    setUser(userData);
  };

  const loginWithGoogle = async (email, nome) => {
    const { token, user: userData } = await api.auth.loginGoogle(email, nome);
    localStorage.setItem('@CRM_Token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('@CRM_Token');
    setUser(null);
  };

  const updateUser = (data) => {
    setUser(prev => ({ ...prev, ...data }));
  };

  const isGestor = user?.role === 'gestor';
  const isCorretor = user?.role === 'corretor';

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, updateUser, loading, isGestor, isCorretor }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
