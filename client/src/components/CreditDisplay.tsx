import { useAuth } from '../contexts/AuthContext';

export default function CreditDisplay() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="inline-flex items-center px-3 py-1 rounded-md bg-gray-100">
        <span className="text-sm font-medium text-gray-500">Loading...</span>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  return (
    <div className="inline-flex items-center px-3 py-1 rounded-md bg-indigo-50">
      <span className="text-sm font-medium text-indigo-700">
        {user.credits} {user.credits === 1 ? 'Credit' : 'Credits'}
      </span>
    </div>
  );
} 