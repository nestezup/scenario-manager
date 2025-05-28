import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ApiOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

interface UseApiWithCreditsReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  insufficientCredits: boolean;
  execute: () => Promise<T | null>;
}

export default function useApiWithCredits<T>({ endpoint, method = 'POST', body, headers }: ApiOptions): UseApiWithCreditsReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insufficientCredits, setInsufficientCredits] = useState(false);
  const { refreshUser } = useAuth();

  const execute = async (): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      setInsufficientCredits(false);
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      
      // Check for insufficient credits (402 Payment Required)
      if (response.status === 402) {
        setInsufficientCredits(true);
        throw new Error('Insufficient credits to perform this operation');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'An error occurred');
      }
      
      const responseData = await response.json();
      setData(responseData);
      
      // Refresh user data to get updated credit balance
      await refreshUser();
      
      return responseData;
    } catch (err: any) {
      console.error('API error:', err);
      setError(err.message || 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, insufficientCredits, execute };
} 