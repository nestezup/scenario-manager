import { useAuth } from '../contexts/AuthContext';
import CreditDisplay from './CreditDisplay';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

export default function Header() {
  const { user, logout, updateCredits } = useAuth();
  const [, setLocation] = useLocation();
  
  // Periodically update credits without triggering full refresh
  useEffect(() => {
    if (user) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/api/me', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
          });
          
          if (response.ok) {
            const userData = await response.json();
            if (userData.credits !== user.credits) {
              updateCredits(userData.credits);
            }
          }
        } catch (err) {
          console.error('Failed to update credits in header:', err);
        }
      }, 30000); // 30초마다 확인 (즉시 업데이트가 주로 사용됨)
      
      return () => clearInterval(interval);
    }
  }, [user, updateCredits]);
  
  const handleLogout = async () => {
    await logout();
    setLocation('/auth/login');
  };
  
  if (!user) {
    return null;
  }
  
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Scenario Manager</h1>
        
        <div className="flex items-center space-x-4">
          <CreditDisplay />
          
          <div className="flex items-center">
            <span className="text-sm text-gray-700 mr-2">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 