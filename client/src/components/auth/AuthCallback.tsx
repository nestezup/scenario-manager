import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // 서버에서 인증을 처리하므로 단순히 홈으로 리디렉션
    console.log('AuthCallback - Redirecting to home page');
    setTimeout(() => {
      setLocation('/');
    }, 1000);
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen flex-col">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
      <p className="text-indigo-700 text-xl font-medium">Authentication successful! Redirecting...</p>
      {error && (
        <div className="mt-4 text-red-600">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
} 