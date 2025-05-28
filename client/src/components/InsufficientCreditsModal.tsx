import React from 'react';

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredCredits: number;
}

export default function InsufficientCreditsModal({
  isOpen,
  onClose,
  requiredCredits,
}: InsufficientCreditsModalProps) {
  if (!isOpen) return null;

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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Insufficient Credits</h3>
          <p className="text-sm text-gray-500 mb-4">
            You need {requiredCredits} {requiredCredits === 1 ? 'credit' : 'credits'} to perform this operation.
            Please add more credits to your account.
          </p>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 