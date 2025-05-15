import React, { useState } from 'react'

interface Scene {
  id: number
  text: string
  order: number
  imagePrompt?: string
  images?: string[]
  selectedImageIndex?: number | null
  selectedImage?: string | null
  videoPrompt?: string
  negativePrompt?: string
}

const SynopsisView: React.FC = () => {
  const [step, setStep] = useState<'input' | 'processing' | 'scenes'>('input')
  const [synopsis, setSynopsis] = useState('')
  const [sceneCount, setSceneCount] = useState(10)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [activeSceneIndex, setActiveSceneIndex] = useState<number | null>(null)
  
  // Progress percentage calculation
  const getProgressPercentage = () => {
    if (scenes.length === 0) return 0
    
    let completedSteps = 0
    let totalSteps = scenes.length * 4 // 4 steps per scene
    
    scenes.forEach(scene => {
      if (scene.imagePrompt) completedSteps++
      if (scene.images && scene.images.length) completedSteps++
      if (scene.selectedImage) completedSteps++
      if (scene.videoPrompt) completedSteps++
    })
    
    return Math.round((completedSteps / totalSteps) * 100)
  }
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (synopsis.trim()) {
      setStep('processing')
      
      // Mock API call for now
      setTimeout(() => {
        const mockScenes = Array.from({ length: sceneCount }, (_, i) => ({
          id: i + 1,
          text: `Scene ${i + 1}: Mock scene description for testing.`,
          order: i + 1
        }))
        
        setScenes(mockScenes)
        setActiveSceneIndex(0)
        setStep('scenes')
      }, 1500)
    }
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-gray-800">시놉시스 기반 영상 제작 자동화</h1>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Synopsis Input Section */}
          {step === 'input' && (
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
                    min="5" 
                    max="20" 
                    step="1"
                    value={sceneCount}
                    onChange={(e) => setSceneCount(parseInt(e.target.value))}
                    className="mt-2 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>5</span>
                    <span>10</span>
                    <span>15</span>
                    <span>20</span>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button 
                    type="submit"
                    disabled={!synopsis.trim()}
                    className={`inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      synopsis.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h18M3 16h18" />
                    </svg>
                    씬 분해
                  </button>
                </div>
              </form>
            </section>
          )}
          
          {/* Processing State */}
          {step === 'processing' && (
            <section className="bg-white rounded-lg shadow-md p-6 mb-8 text-center">
              <div className="animate-pulse flex flex-col items-center py-10">
                <div className="rounded-full bg-blue-400 h-10 w-10 mb-4"></div>
                <p className="text-lg text-gray-700">시놉시스를 분석하여 씬을 생성하고 있습니다...</p>
                <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요.</p>
              </div>
            </section>
          )}
          
          {/* Scenes Display - Will be implemented later */}
          {step === 'scenes' && (
            <section className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4">생성된 씬</h2>
              <div className="grid gap-4">
                {scenes.map((scene) => (
                  <div key={scene.id} className="border rounded-md p-4">
                    <h3 className="font-medium">씬 {scene.order}</h3>
                    <p className="text-gray-700 mt-1">{scene.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-between">
                <button 
                  onClick={() => setStep('input')}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ← 시놉시스로 돌아가기
                </button>
                <div className="text-gray-500">
                  진행률: {getProgressPercentage()}%
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">시놉시스 기반 영상 제작 자동화 POC v0.1 © 2025</p>
        </div>
      </footer>
    </div>
  )
}

export default SynopsisView