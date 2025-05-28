import { useAuth } from '../contexts/AuthContext';
import CreditDisplay from './CreditDisplay';
import { useLocation } from 'wouter';

export default function Header() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  
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