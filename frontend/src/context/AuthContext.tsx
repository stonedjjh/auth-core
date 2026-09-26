import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ApiAdapter } from '../services/api.adapter';

export interface User {
  id: string;
  username: string;
  email: string;
  is_verified: boolean | number;
  two_factor_enabled: boolean | number;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  api: ApiAdapter;
  loginSuccess: (user: User, token: string) => void;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Instancia del adaptador desacoplado
  const api = new ApiAdapter({
    baseUrl: '/api',
    getAccessToken: () => accessToken,
    onUnauthorized: () => {
      setAccessToken(null);
      setUser(null);
    },
  });

  // Intentar renovar sesion silenciosa al montar la aplicacion (Cookie httpOnly)
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const res = await api.post<{ user: User; accessToken: string }>('/auth/refresh');
        if (isMounted && res.success && res.data) {
          setUser(res.data.user);
          setAccessToken(res.data.accessToken);
        }
      } catch {
        // Sesion no existente o expirada
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const loginSuccess = (newUser: User, token: string) => {
    setUser(newUser);
    setAccessToken(token);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        api,
        loginSuccess,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
