import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const processAuth = async () => {
      try {
        console.log('AuthCallback - Processing authentication response');
        
        // URL 파라미터에서 코드 추출
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        // URL 해시에서 토큰 추출
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        console.log('AuthCallback - URL parameters:', { 
          code: code ? 'Present (length: ' + code.length + ')' : 'Not found',
          accessToken: accessToken ? 'Present (length: ' + accessToken.length + ')' : 'Not found', 
          refreshToken: refreshToken ? 'Present' : 'Not found',
          type
        });
        
        if (code) {
          // 코드가 있으면 서버에 전달하여 세션 설정
          console.log('Processing code-based authentication');
          // 서버가 코드를 처리하므로 아무것도 하지 않음
        } else if (accessToken) {
          // 액세스 토큰이 있으면 직접 처리
          console.log('Processing token-based authentication');
          
          // 토큰을 서버에 전달하여 세션 설정
          const response = await fetch('/api/auth/session-from-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              access_token: accessToken,
              refresh_token: refreshToken,
              type
            }),
            credentials: 'include' // 세션 쿠키 포함
          });
          
          const responseData = await response.json();
          console.log('AuthCallback - Authentication response:', responseData);
          
          if (!response.ok) {
            throw new Error(responseData.message || 'Failed to authenticate');
          }
          
          // 인증 성공 후 URL 해시 제거 (클린업)
          window.history.replaceState(null, '', window.location.pathname);
          
          // 로그인 성공, 홈으로 리디렉션
          setLocation('/');
          return;
        } else {
          throw new Error('No authentication code or token found');
        }
        
        // 인증이 서버에서 처리되므로 홈 페이지로 리디렉션
        setLocation('/');
      } catch (err: any) {
        console.error('Authentication error:', err);
        setError(err.message || 'Authentication failed');
        // 1초 후 로그인 페이지로 리디렉션
        setTimeout(() => {
          setLocation('/auth/login?error=auth_failed');
        }, 1000);
      }
    };

    processAuth();
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen flex-col">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
      <p className="text-indigo-700 text-xl font-medium">Authenticating...</p>
      {error && (
        <div className="mt-4 text-red-600">
          <p>{error}</p>
          <p className="text-sm mt-2">You will be redirected to the login page.</p>
        </div>
      )}
    </div>
  );
} 