import React, { useState } from 'react'

interface SynopsisFormProps {
  onSubmit: (synopsis: string, sceneCount: number) => void
}

const SynopsisForm: React.FC<SynopsisFormProps> = ({ onSubmit }) => {
  const [synopsis, setSynopsis] = useState('')
  const [sceneCount, setSceneCount] = useState(3)
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (synopsis.trim()) {
      onSubmit(synopsis, sceneCount)
    }
  }
  
  return (
    <section className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-lg font-semibold mb-4">시놉시스 입력</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="synopsis" className="block text-sm font-medium text-gray-700">시놉시스</label>
          <textarea 
            id="synopsis" 
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-3 h-40 border"
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
            className={`inline-flex items-center justify-center px-4 py-2 border rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
              synopsis.trim() 
                ? 'bg-primary-500 text-white hover:bg-primary-600 border-transparent' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-300'
            }`}
          >
            <i className="fas fa-film mr-2"></i>
            씬 분해
          </button>
        </div>
      </form>
    </section>
  )
}

export default SynopsisForm