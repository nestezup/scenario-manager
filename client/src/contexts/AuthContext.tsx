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
      const response = await fetch('/api/me');
      
      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, clear user
          setUser(null);
          
          // Get the response text to check for specific error messages
          const errorData = await response.json().catch(() => ({}));
          console.error('Authentication error:', errorData);
          
          // Check if it's an "Invalid session" error specifically
          if (errorData.message && errorData.message.includes('Invalid session')) {
            console.log('Invalid session detected, redirecting to login page');
            
            // Redirect to login page after a short delay
            setTimeout(() => {
              setLocation('/auth/login');
            }, 100);
          }
          
          return;
        }
        throw new Error('Failed to fetch user data');
      }
      
      const userData = await response.json();
      setUser(userData);
    } catch (err: any) {
      console.error('Error fetching user:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to logout');
      }
      
      setUser(null);
      // Redirect to login page after logout
      setLocation('/auth/login');
    } catch (err: any) {
      console.error('Error logging out:', err);
      setError(err.message || 'An error occurred during logout');
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, logout, refreshUser }}>
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