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
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">씬 {index + 1}</h3>
          <div className="flex space-x-2">
            <button 
              onClick={() => moveScene(-1)} 
              disabled={index === 0}
              className={`p-1 rounded hover:bg-gray-100 ${
                index === 0 ? 'text-gray-400 cursor-not-allowed' : ''
              }`}
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <button 
              onClick={() => moveScene(1)} 
              disabled={index === scenes.length - 1}
              className={`p-1 rounded hover:bg-gray-100 ${
                index === scenes.length - 1 ? 'text-gray-400 cursor-not-allowed' : ''
              }`}
            >
              <i className="fas fa-arrow-right"></i>
            </button>
            <button 
              onClick={() => deleteScene(index)}
              disabled={scenes.length <= 1}
              className={`p-1 rounded ${
                scenes.length > 1 
                  ? 'text-red-500 hover:bg-red-50' 
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              <i className="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        {/* Scene Text Editor */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">씬 내용</label>
          <textarea 
            value={text} 
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            className="w-full border border-gray-300 rounded-md shadow-sm p-3 h-24 focus:border-primary-500 focus:ring-primary-500"
          ></textarea>
        </div>
        
        {/* Workflow Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Step 1: Image Prompt */}
          <div className="border border-gray-200 rounded-md p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-800">1. 이미지 프롬프트</h4>
              <button 
                onClick={generateImagePromptForScene}
                disabled={!scene.text.trim()}
                className={`px-2 py-1 rounded-md text-xs font-medium ${
                  scene.text.trim() 
                    ? 'bg-primary-500 text-white hover:bg-primary-600' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                생성하기
              </button>
            </div>
            
            {/* Prompt Display or Loading */}
            {scene.loadingImagePrompt ? (
              <div className="animate-pulse flex items-center py-2">
                <i className="fas fa-spinner fa-spin text-gray-400 mr-2"></i>
                <span className="text-sm text-gray-500">프롬프트 생성 중...</span>
              </div>
            ) : scene.imagePrompt ? (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm font-mono text-gray-700">{scene.imagePrompt}</p>
              </div>
            ) : null}
          </div>
          
          {/* Step 2: Generate & Select Images */}
          <div className="border border-gray-200 rounded-md p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-800">2. 이미지 생성 및 선택</h4>
              <button 
                onClick={generateImagesForScene}
                disabled={!scene.imagePrompt}
                className={`px-2 py-1 rounded-md text-xs font-medium ${
                  scene.imagePrompt 
                    ? 'bg-primary-500 text-white hover:bg-primary-600' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                이미지 생성
              </button>
            </div>
            
            {/* Images Loading State */}
            {scene.loadingImages ? (
              <div className="animate-pulse flex items-center justify-center py-4">
                <i className="fas fa-spinner fa-spin text-gray-400 mr-2"></i>
                <span className="text-sm text-gray-500">이미지 생성 중...</span>
              </div>
            ) : scene.images && scene.images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {scene.images.map((image, idx) => (
                  <div 
                    key={idx}
                    onClick={() => selectImage(idx)}
                    className={`relative cursor-pointer rounded-md overflow-hidden ${
                      scene.selectedImageIndex === idx ? 'ring-2 ring-primary-500 ring-offset-2' : ''
                    }`}
                  >
                    <img 
                      src={image} 
                      className="w-full h-24 object-cover" 
                      alt={`Scene ${index + 1} candidate image ${idx + 1}`}
                    />
                    {scene.selectedImageIndex === idx && (
                      <div className="absolute top-1 right-1 bg-primary-500 rounded-full w-5 h-5 flex items-center justify-center">
                        <i className="fas fa-check text-white text-xs"></i>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          
          {/* Step 3: Video Prompt Generation */}
          <div className="border border-gray-200 rounded-md p-4 md:col-span-2">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-800">3. 영상 프롬프트 생성</h4>
              <button 
                onClick={generateVideoPromptForScene}
                disabled={!scene.selectedImage}
                className={`px-2 py-1 rounded-md text-xs font-medium ${
                  scene.selectedImage 
                    ? 'bg-primary-500 text-white hover:bg-primary-600' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                프롬프트 생성
              </button>
            </div>
            
            {/* Video Prompt Loading */}
            {scene.loadingVideoPrompt ? (
              <div className="animate-pulse flex items-center py-2">
                <i className="fas fa-spinner fa-spin text-gray-400 mr-2"></i>
                <span className="text-sm text-gray-500">영상 프롬프트 생성 중...</span>
              </div>
            ) : scene.videoPrompt ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">영상 프롬프트</label>
                  <div className="bg-gray-50 p-3 rounded-md h-32 overflow-y-auto">
                    <p className="text-sm font-mono text-gray-700">{scene.videoPrompt}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Negative Prompt</label>
                  <div className="bg-gray-50 p-3 rounded-md h-32 overflow-y-auto">
                    <p className="text-sm font-mono text-gray-700">{scene.negativePrompt}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          
          {/* Step 4: Generate Video (Only shown if video prompt is available) */}
          {scene.videoPrompt && (
            <div className="border border-gray-200 rounded-md p-4 md:col-span-2 mt-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-800">4. 영상 생성 (세로형 9:16 비율)</h4>
                <button 
                  onClick={() => generateVideoForScene()}
                  disabled={!scene.videoPrompt || (scene as SceneWithVideo).loadingVideo || (scene as SceneWithVideo).videoStatus === 'pending'}
                  className="px-2 py-1 rounded-md text-xs font-medium bg-primary-500 text-white hover:bg-primary-600"
                >
                  영상 생성하기
                </button>
              </div>
              
              {/* Video Generation Status */}
              {(scene as SceneWithVideo).loadingVideo ? (
                <div className="animate-pulse flex items-center py-2">
                  <i className="fas fa-spinner fa-spin text-gray-400 mr-2"></i>
                  <span className="text-sm text-gray-500">영상 생성 요청 처리 중...</span>
                </div>
              ) : (scene as SceneWithVideo).videoStatus === 'pending' ? (
                <div className="flex flex-col items-center py-4 space-y-2">
                  <div className="flex items-center">
                    <i className="fas fa-clock text-amber-500 mr-2"></i>
                    <span className="text-sm text-gray-700">영상 생성 진행 중... (30초~1분 소요)</span>
                  </div>
                  <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full w-1/2 animate-pulse"></div>
                  </div>
                </div>
              ) : (scene as SceneWithVideo).videoStatus === 'completed' && (scene as SceneWithVideo).thumbnailUrl ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  {/* 썸네일 이미지 */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-full max-w-[200px] aspect-[9/16] bg-gray-100 rounded-md overflow-hidden shadow-md">
                      <img 
                        src={(scene as SceneWithVideo).thumbnailUrl} 
                        alt="Video thumbnail" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 hover:bg-opacity-40 transition-all">
                        <a 
                          href={(scene as SceneWithVideo).videoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-white bg-primary-500 hover:bg-primary-600 rounded-full w-12 h-12 flex items-center justify-center"
                        >
                          <i className="fas fa-play"></i>
                        </a>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">영상을 클릭하여 보기</p>
                  </div>
                  
                  {/* 영상 정보 */}
                  <div>
                    <div className="space-y-2">
                      <h5 className="font-medium">세로형 영상 (9:16)</h5>
                      <p className="text-sm text-gray-700">선택한 이미지를 기반으로 영상을 생성했습니다.</p>
                      <a 
                        href={(scene as SceneWithVideo).videoUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary-600 hover:text-primary-700"
                      >
                        <i className="fas fa-download mr-1"></i>
                        <span>영상 다운로드</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (scene as SceneWithVideo).videoStatus === 'failed' ? (
                <div className="text-center py-4">
                  <div className="text-red-500 mb-2">
                    <i className="fas fa-exclamation-circle text-xl"></i>
                  </div>
                  <p className="text-sm text-gray-700">영상 생성 중 오류가 발생했습니다. 다시 시도해 주세요.</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SceneCard