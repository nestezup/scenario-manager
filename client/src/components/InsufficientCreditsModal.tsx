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
  operation = "이 작업"
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">크레딧이 부족합니다</h3>
          
          <div className="text-sm text-gray-600 mb-4 space-y-2">
            <p><strong>{operation}</strong>을 수행하기 위한 크레딧이 부족합니다.</p>
            
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">현재 보유 크레딧:</span>
                <span className="text-indigo-600 font-bold">{currentCredits}개</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">필요한 크레딧:</span>
                <span className="text-red-600 font-bold">{requiredCredits}개</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between items-center">
                <span className="font-medium">부족한 크레딧:</span>
                <span className="text-red-600 font-bold">{shortfall}개</span>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 mt-3 space-y-1">
              <p><strong>크레딧 사용량:</strong></p>
              <ul className="text-left space-y-1">
                <li>• 씬 파싱: 5 크레딧</li>
                <li>• 이미지 프롬프트 생성: 5 크레딧</li>
                <li>• 이미지 생성 (3개): 15 크레딧</li>
                <li>• 영상 프롬프트 생성: 5 크레딧</li>
                <li>• 영상 생성: 10 크레딧</li>
              </ul>
              <p className="mt-2">크레딧 구매 또는 일일 크레딧 갱신을 기다려주세요.</p>
            </div>
          </div>
          
          <div className="mt-4 flex justify-center space-x-3">
            <button
              type="button"
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
              onClick={onClose}
            >
              닫기
            </button>
            <button
              type="button"
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
              onClick={() => {
                // TODO: Implement credit purchase flow
                alert('크레딧 구매 기능은 곧 출시됩니다!');
              }}
            >
              크레딧 구매
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 