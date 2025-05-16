import React, { useState, useEffect } from 'react'
import { Scene, SceneWithVideo } from '../types'
import { useSceneStore } from '../store/sceneStore'

interface SceneCardProps {
  scene: Scene
  index: number
}

const SceneCard: React.FC<SceneCardProps> = ({ scene, index }) => {
  const { 
    scenes, 
    updateSceneText, 
    generateImagePromptForScene, 
    generateImagesForScene, 
    selectImage, 
    generateVideoPromptForScene,
    generateVideoForScene,
    moveScene, 
    deleteScene 
  } = useSceneStore()
  
  const [text, setText] = useState(scene.text)
  
  // Update local state when scene changes
  useEffect(() => {
    setText(scene.text)
  }, [scene])
  
  // Update store when text is done editing
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
  }
  
  const handleTextBlur = () => {
    updateSceneText(index, text)
  }
  
  return (
    <div className="bg-white">
      <h2 className="text-xl font-medium mb-4">씬 {index + 1}</h2>
      
      <div className="space-y-6">
        {/* 씬 내용 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">씬 내용</label>
          <textarea 
            value={text} 
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            className="w-full border border-gray-300 rounded-md p-3 h-28"
            placeholder="씬 내용을 입력하세요"
          ></textarea>
        </div>
        
        {/* 워크플로우 단계 */}
        <div className="space-y-6">
          {/* 1. 이미지 프롬프트 */}
          <div className="border border-gray-200 rounded-md p-4">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-medium">1. 이미지 프롬프트</h3>
              <button 
                onClick={generateImagePromptForScene}
                disabled={!scene.text.trim()}
                className={`px-4 py-1 rounded-md text-sm ${
                  scene.text.trim() 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                생성하기
              </button>
            </div>
            
            {scene.loadingImagePrompt ? (
              <div className="flex items-center text-gray-500 text-sm py-2">
                <span className="mr-2">프롬프트 생성 중...</span>
              </div>
            ) : scene.imagePrompt ? (
              <div className="bg-gray-50 p-3 rounded text-sm mt-2">
                {scene.imagePrompt}
              </div>
            ) : null}
          </div>
          
          {/* 2. 이미지 생성 및 선택 */}
          <div className="border border-gray-200 rounded-md p-4">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-medium">2. 이미지 생성 및 선택</h3>
              <button 
                onClick={generateImagesForScene}
                disabled={!scene.imagePrompt}
                className={`px-4 py-1 rounded-md text-sm ${
                  scene.imagePrompt 
                    ? 'bg-gray-200 text-gray-700' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                이미지 생성
              </button>
            </div>
            
            {scene.loadingImages ? (
              <div className="flex items-center text-gray-500 text-sm py-2">
                <span>이미지 생성 중...</span>
              </div>
            ) : scene.images && scene.images.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 mt-2">
                {scene.images.map((image, idx) => (
                  <div 
                    key={idx}
                    onClick={() => selectImage(idx)}
                    className={`relative cursor-pointer rounded overflow-hidden ${
                      scene.selectedImageIndex === idx ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <img 
                      src={image} 
                      className="w-full h-24 object-cover" 
                      alt={`Scene ${index + 1} image option ${idx + 1}`}
                    />
                    {scene.selectedImageIndex === idx && (
                      <div className="absolute top-1 right-1 bg-blue-500 rounded-full w-5 h-5 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          
          {/* 3. 영상 프롬프트 생성 */}
          <div className="border border-gray-200 rounded-md p-4">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-medium">3. 영상 프롬프트 생성</h3>
              <button 
                onClick={generateVideoPromptForScene}
                disabled={!scene.selectedImage}
                className={`px-4 py-1 rounded-md text-sm ${
                  scene.selectedImage 
                    ? 'bg-gray-200 text-gray-700' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                프롬프트 생성
              </button>
            </div>
            
            {scene.loadingVideoPrompt ? (
              <div className="flex items-center text-gray-500 text-sm py-2">
                <span>영상 프롬프트 생성 중...</span>
              </div>
            ) : scene.videoPrompt ? (
              <div className="bg-gray-50 p-3 rounded text-sm mt-2">
                <div>
                  <strong className="text-gray-700 block mb-1">영상 프롬프트:</strong>
                  <p>{scene.videoPrompt}</p>
                </div>
                {scene.negativePrompt && (
                  <div className="mt-3">
                    <strong className="text-gray-700 block mb-1">Negative 프롬프트:</strong>
                    <p>{scene.negativePrompt}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
          
          {/* 4. 영상 생성 - 항상 표시 */}
          <div className="border border-gray-200 rounded-md p-4">
            <div className="flex justify-between items-center">
              <h3 className="text-md font-medium">4. 영상 생성</h3>
              <button 
                onClick={generateVideoForScene}
                disabled={!scene.videoPrompt || !scene.selectedImage}
                className={`px-4 py-1 rounded-md text-sm ${
                  scene.videoPrompt && scene.selectedImage
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                영상 생성
              </button>
            </div>
            
            {/* 영상 생성 UI - 항상 표시하도록 개선 */}
            <div className="mt-2">
              {(scene as SceneWithVideo).loadingVideo ? (
                <div className="flex items-center text-gray-500 text-sm py-2">
                  <span>영상 생성 요청 처리 중...</span>
                </div>
              ) : (scene as SceneWithVideo).videoStatus === 'pending' ? (
                <div className="text-center py-3">
                  <div className="text-amber-500 text-sm mb-2">영상 생성 진행 중... (30초~1분 소요)</div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div className="w-1/2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              ) : (scene as SceneWithVideo).videoStatus === 'completed' && (scene as SceneWithVideo).thumbnailUrl ? (
                <div className="flex items-center space-x-4">
                  <div className="relative w-28 aspect-[9/16] bg-gray-100 rounded overflow-hidden">
                    <img 
                      src={(scene as SceneWithVideo).thumbnailUrl} 
                      alt="영상 썸네일" 
                      className="w-full h-full object-cover"
                    />
                    <a 
                      href={(scene as SceneWithVideo).videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-40"
                    >
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"></path>
                        </svg>
                      </div>
                    </a>
                  </div>
                  <div>
                    <div className="font-medium">세로형 영상 (9:16)</div>
                    <a 
                      href={(scene as SceneWithVideo).videoUrl}
                      className="text-blue-500 text-sm hover:underline flex items-center mt-1"
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      다운로드
                    </a>
                  </div>
                </div>
              ) : (scene as SceneWithVideo).videoStatus === 'failed' ? (
                <div className="text-center py-3 text-red-500">
                  영상 생성 중 오류가 발생했습니다. 다시 시도해 주세요.
                </div>
              ) : (
                <div className="text-center py-3 text-gray-500 text-sm">
                  <p>이미지를 선택하고 영상 프롬프트를 생성한 후 영상 생성을 시작하세요.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 씬 네비게이션 */}
        <div className="flex justify-between mt-4">
          <button 
            onClick={() => moveScene(-1)} 
            disabled={index === 0}
            className="text-gray-400"
          >
            &lt;
          </button>
          <button 
            onClick={() => moveScene(1)} 
            disabled={index === scenes.length - 1}
            className="text-gray-400"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  )
}

export default SceneCard