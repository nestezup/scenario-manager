import React, { useState } from 'react'

interface SynopsisFormProps {
  synopsis: string;
  setSynopsis: (synopsis: string) => void;
  sceneCount: number;
  setSceneCount: (count: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const SynopsisForm: React.FC<SynopsisFormProps> = ({ 
  synopsis, 
  setSynopsis, 
  sceneCount, 
  setSceneCount, 
  onSubmit 
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    onSubmit(e);
  };

  return (
    <section className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">시놉시스 입력</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="synopsis" className="block text-sm font-medium text-gray-700">시놉시스</label>
          <textarea 
            id="synopsis" 
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 h-40 border"
            placeholder="영상으로 만들고 싶은 이야기를 자유롭게 입력해주세요. (예: 소년이 숲속에서 신비한 생명체를 만나게 되고...)"
          ></textarea>
        </div>
        
        <div>
          <label htmlFor="scene-count" className="block text-sm font-medium text-gray-700">씬 개수: {sceneCount}</label>
          <input 
            type="range" 
            id="scene-count" 
            min="3" 
            max="20" 
            step="1"
            value={sceneCount}
            onChange={(e) => setSceneCount(parseInt(e.target.value))}
            className="mt-2 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>3</span>
            <span>8</span>
            <span>14</span>
            <span>20</span>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button 
            type="submit"
            disabled={!synopsis.trim()}
            className={`inline-flex items-center justify-center px-4 py-2 border rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              synopsis.trim() 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 border-transparent' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-300'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4zm2 0h1V9h-1v2zm1-4V5h-1v2h1zM5 5v2H4V5h1zm0 4H4v2h1V9zm-1 4h1v2H4v-2z" clipRule="evenodd" />
            </svg>
            씬 분해
          </button>
        </div>
      </form>
    </section>
  )
}

export default SynopsisForm