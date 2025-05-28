import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredCredits: number;
  operation?: string;
}

export default function InsufficientCreditsModal({
  isOpen,
  onClose,
  requiredCredits,
  operation = "this operation"
}: InsufficientCreditsModalProps) {
  const { user } = useAuth();
  
  if (!isOpen) return null;

  const currentCredits = user?.credits || 0;
  const shortfall = requiredCredits - currentCredits;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 z-10">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Insufficient Credits</h3>
          
          <div className="text-sm text-gray-600 mb-4 space-y-2">
            <p>You don't have enough credits to perform {operation}.</p>
            
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">Current credits:</span>
                <span className="text-indigo-600 font-bold">{currentCredits}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">Required credits:</span>
                <span className="text-red-600 font-bold">{requiredCredits}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between items-center">
                <span className="font-medium">You need:</span>
                <span className="text-red-600 font-bold">{shortfall} more credits</span>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-3">
              Contact support to purchase additional credits or wait for your daily credit refresh.
            </p>
          </div>
          
          <div className="mt-4 flex justify-center space-x-3">
            <button
              type="button"
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
              onClick={() => {
                // TODO: Implement credit purchase flow
                alert('Credit purchase feature coming soon!');
              }}
            >
              Get Credits
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 