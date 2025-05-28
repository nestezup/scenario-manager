import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, error } = useAuth();
  const [, setLocation] = useLocation();
  const [authFailed, setAuthFailed] = useState(false);
  
  useEffect(() => {
    if (!loading && !user) {
      // If authentication check is complete and no user, count as failed
      setAuthFailed(true);
      
      // Redirect to login if not authenticated
      const timer = setTimeout(() => {
        setLocation('/auth/login');
      }, 2000); // Give user time to see the message
      
      return () => clearTimeout(timer);
    }
  }, [user, loading, setLocation]);
  
  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-indigo-700 mt-4">Checking authentication...</p>
      </div>
    );
  }
  
  // Show error message if authentication failed
  if (authFailed || error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-red-50 p-4 rounded-md max-w-md">
          <h2 className="text-lg font-medium text-red-800 mb-2">Authentication Failed</h2>
          <p className="text-red-700 mb-4">
            {error || "Your session is invalid or has expired. Please log in again."}
          </p>
          <button 
            onClick={() => setLocation('/auth/login')}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
          >
            Go to Login Page
          </button>
        </div>
      </div>
    );
  }
  
  // Only render children if authenticated
  return user ? <>{children}</> : null;
} 