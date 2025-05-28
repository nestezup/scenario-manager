import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';

interface User {
  id: string;
  email: string;
  credits: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateCredits: (newCredits: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('AuthContext - Making /api/me request');
      
      const response = await fetch('/api/me', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('AuthContext - /api/me response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('AuthContext - 401 response, user not authenticated');
          setUser(null);
          return;
        }
        throw new Error('Failed to fetch user data');
      }
      
      const userData = await response.json();
      console.log('AuthContext - Successfully fetched user data:', userData);
      setUser(userData);
    } catch (err: any) {
      console.error('Error fetching user:', err);
      setError(err.message || 'An error occurred');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      setUser(null);
      setLocation('/auth/login');
    } catch (err: any) {
      console.error('Error logging out:', err);
      setUser(null);
      setLocation('/auth/login');
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const updateCredits = (newCredits: number) => {
    if (user) {
      setUser({ ...user, credits: newCredits });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      logout, 
      refreshUser,
      updateCredits
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 