import React, { useState, useEffect } from 'react'
import { Scene } from '../types'
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
        </div>
      </div>
    </div>
  )
}

export default SceneCard