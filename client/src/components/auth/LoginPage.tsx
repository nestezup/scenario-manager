import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');

// 중복 요청 방지를 위한 상수
const RATE_LIMIT_DURATION = 60000; // 60초
const RATE_LIMIT_KEY = 'magic_link_last_sent';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  // Extract error from URL query params
  const params = new URLSearchParams(window.location.search);
  const urlError = params.get('error');

  // 중복 요청 확인 함수
  const checkRateLimit = (email: string): boolean => {
    try {
      const lastSentData = localStorage.getItem(RATE_LIMIT_KEY);
      if (!lastSentData) return true;
      
      const { email: lastEmail, timestamp } = JSON.parse(lastSentData);
      const now = Date.now();
      
      // 같은 이메일에 대해 60초 이내 요청이면 차단
      if (lastEmail === email && (now - timestamp) < RATE_LIMIT_DURATION) {
        const remainingTime = Math.ceil((RATE_LIMIT_DURATION - (now - timestamp)) / 1000);
        setError(`Please wait ${remainingTime} seconds before requesting another magic link.`);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Rate limit check error:', err);
      return true; // 오류 시 요청 허용
    }
  };

  // 요청 기록 저장 함수
  const recordRequest = (email: string) => {
    try {
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({
        email,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('Failed to record request:', err);
    }
  };

  // Function to clear session and cookies
  const handleResetSession = async () => {
    try {
      setLoading(true);
      
      // Call logout API to clear server-side session
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Clear rate limit data
      localStorage.removeItem(RATE_LIMIT_KEY);
      
      // Clear hash and URL parameters
      window.history.replaceState(null, '', '/auth/login');
      
      // Show success message
      setSuccess('Session reset successfully. You can now try logging in again.');
      setError(null);
      
      // Reload the page to ensure a fresh state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Failed to reset session:', err);
      setError('Failed to reset session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 페이지 로드 시 URL 해시(#)에 토큰이 있는지 확인
  useEffect(() => {
    const checkAuthParams = async () => {
      console.log('LoginPage - Checking for authentication parameters');
      
      // URL 쿼리 파라미터에서 코드 확인 (매직 링크 흐름)
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      // URL 해시에서 토큰 확인 (OAuth 흐름)
      const hashString = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hashString);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      
      console.log('LoginPage - Auth parameters:', { 
        code: code ? 'Present (length: ' + code.length + ')' : 'Not found',
        accessToken: accessToken ? 'Present (length: ' + accessToken.length + ')' : 'Not found', 
        hash: window.location.hash ? 'Present' : 'Not found'
      });
      
      // 코드가 있으면 서버측 처리로 리다이렉트
      if (code) {
        console.log('LoginPage - Found auth code, redirecting to callback handler');
        window.location.href = `/auth/callback?code=${code}`;
        return;
      }
      
      // 해시가 있지만 토큰이 없으면 오류 표시
      if (window.location.hash && !accessToken) {
        console.error('LoginPage - Hash present but no access_token found');
        setError('Authentication failed: URL contains hash but no valid token found. This might be due to an invalid or expired authentication link.');
        return;
      }
      
      // 토큰이 있으면 처리
      if (accessToken) {
        setLoading(true);
        console.log('LoginPage - Found access token in hash, attempting to authenticate');
        
        try {
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
          console.log('LoginPage - Authentication response:', responseData);
          
          if (!response.ok) {
            throw new Error(responseData.message || 'Failed to authenticate');
          }
          
          console.log('LoginPage - Successfully authenticated with token');
          
          // 인증 성공 후 URL 해시 제거 (클린업)
          window.history.replaceState(null, '', window.location.pathname);
          
          // 메인 페이지로 리디렉션
          setLocation('/');
        } catch (err: any) {
          console.error('LoginPage - Token authentication error:', err);
          setError('Authentication failed: ' + err.message);
          setLoading(false);
        }
      }
    };
    
    checkAuthParams();
  }, [setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      // Validate email
      emailSchema.parse(email);
      
      // 중복 요청 확인
      if (!checkRateLimit(email)) {
        return; // 에러 메시지는 checkRateLimit에서 설정됨
      }
      
      setLoading(true);
      
      // Call API to send magic link
      const response = await fetch('/api/magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // 429 상태 코드 (rate limit)인 경우 특별 처리
        if (response.status === 429) {
          setError(data.message || 'Too many requests. Please wait before trying again.');
          return;
        }
        throw new Error(data.message || 'Failed to send magic link');
      }
      
      // 요청 성공 시 기록 저장
      recordRequest(email);
      
      // 속도 제한 메시지가 포함된 경우 표시
      if (data.message && data.message.includes('recently sent')) {
        setSuccess('A magic link was recently sent to this email. Please check your inbox or wait a moment before trying again.');
      } else {
        setSuccess('Magic link sent! Please check your email.');
      }
      
      // 사용자가 실수로 두 번 클릭하는 것을 방지하기 위해
      // 성공 후 버튼을 60초 동안 비활성화 (rate limit과 동일)
      setTimeout(() => {
        setLoading(false);
      }, RATE_LIMIT_DURATION);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError(err.message || 'An error occurred');
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email to receive a magic link
          </p>
        </div>
        
        {urlError && !error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {urlError === 'invalid_code' && 'Invalid authentication code'}
                  {urlError === 'auth_failed' && 'Authentication failed'}
                  {urlError === 'server_error' && 'Server error occurred'}
                  {!['invalid_code', 'auth_failed', 'server_error'].includes(urlError) && 'Authentication error'}
                </h3>
                <p className="text-sm text-red-700 mt-2">
                  Please try again or contact support if the problem persists.
                </p>
                <button 
                  onClick={handleResetSession}
                  className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Reset session and try again
                </button>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-2">{error}</p>
                <button 
                  onClick={handleResetSession}
                  className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Reset session and try again
                </button>
              </div>
            </div>
          </div>
        )}
        
        {success && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <p className="text-sm text-green-700 mt-2">{success}</p>
              </div>
            </div>
          </div>
        )}
        
        {loading && window.location.hash && (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-2"></div>
            <p className="text-indigo-700">Authenticating...</p>
          </div>
        )}
        
        {(!loading || !window.location.hash) && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="-space-y-px rounded-md shadow-sm">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 