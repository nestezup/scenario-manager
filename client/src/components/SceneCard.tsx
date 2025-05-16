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

  // 씬 타입 캐스팅
  const sceneWithVideo = scene as SceneWithVideo;
  
  return (
    <div className="bg-white p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-medium">씬 {index + 1}</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => moveScene(-1)}
            disabled={index === 0}
            className="text-gray-400 px-2"
          >
            &lt;
          </button>
          <button
            onClick={() => moveScene(1)}
            disabled={index === scenes.length - 1}
            className="text-gray-400 px-2"
          >
            &gt;
          </button>
        </div>
      </div>
      
      {/* 씬 내용 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">씬 내용</label>
        <textarea 
          value={text} 
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          className="w-full border border-gray-300 rounded-md p-3 h-24"
          placeholder="씬 내용을 입력하세요"
        ></textarea>
      </div>
      
      {/* 시각 구분선 */}
      <div className="border-t border-gray-200 my-6"></div>
      
      {/* 워크플로우 단계 */}
      <div className="space-y-6">
        {/* 1. 이미지 프롬프트 */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium">1. 이미지 프롬프트</h3>
            <button 
              onClick={generateImagePromptForScene}
              disabled={!text.trim()}
              className={`px-4 py-1 rounded-md text-sm ${
                text.trim() 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              생성하기
            </button>
          </div>
          
          {scene.loadingImagePrompt ? (
            <div className="py-2 text-sm text-gray-500">프롬프트 생성 중...</div>
          ) : scene.imagePrompt ? (
            <div className="bg-gray-50 p-3 rounded border border-gray-100">
              {scene.imagePrompt}
            </div>
          ) : (
            <div className="py-2 text-sm text-gray-500">씬 내용을 입력한 후 이미지 프롬프트를 생성하세요.</div>
          )}
        </div>
        
        {/* 2. 이미지 생성 및 선택 */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium">2. 이미지 생성 및 선택</h3>
            <button 
              onClick={generateImagesForScene}
              disabled={!scene.imagePrompt}
              className={`px-4 py-1 rounded-md text-sm ${
                scene.imagePrompt 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              이미지 생성
            </button>
          </div>
          
          {scene.loadingImages ? (
            <div className="py-2 text-sm text-gray-500">이미지 생성 중...</div>
          ) : scene.images && scene.images.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {scene.images.map((image, idx) => (
                <div 
                  key={idx}
                  onClick={() => selectImage(idx)}
                  className={`relative cursor-pointer rounded overflow-hidden ${
                    scene.selectedImageIndex === idx ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="aspect-[9/16] w-full flex items-center justify-center bg-gray-50">
                    <div className="h-full w-full">
                      <img 
                        src={image} 
                        className="h-full w-full object-contain" 
                        alt={`Scene ${index + 1} image option ${idx + 1}`}
                        style={{ maxHeight: '100%', maxWidth: '100%' }}
                      />
                    </div>
                  </div>
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
          ) : (
            <div className="py-2 text-sm text-gray-500">이미지 프롬프트를 생성한 후 이미지를 생성하세요.</div>
          )}
        </div>
        
        {/* 3. 영상 프롬프트 생성 */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium">3. 영상 프롬프트 생성</h3>
            <button 
              onClick={generateVideoPromptForScene}
              disabled={!scene.selectedImage}
              className={`px-4 py-1 rounded-md text-sm ${
                scene.selectedImage 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              프롬프트 생성
            </button>
          </div>
          
          {scene.loadingVideoPrompt ? (
            <div className="py-2 text-sm text-gray-500">영상 프롬프트 생성 중...</div>
          ) : scene.videoPrompt ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                <div>
                  <div className="text-sm font-medium mb-1">영상 프롬프트:</div>
                  <div className="bg-gray-50 p-3 rounded border border-gray-100 min-h-[60px]">
                    {scene.videoPrompt}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Negative 프롬프트:</div>
                  <div className="bg-gray-50 p-3 rounded border border-gray-100 min-h-[60px]">
                    {scene.negativePrompt}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-2 text-sm text-gray-500">이미지를 선택한 후 영상 프롬프트를 생성하세요.</div>
          )}
        </div>
        
        {/* 4. 영상 생성 */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium">4. 영상 생성</h3>
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
          
          {sceneWithVideo.loadingVideo ? (
            <div className="py-2 text-sm text-gray-500">영상 생성 요청 처리 중...</div>
          ) : sceneWithVideo.videoStatus === 'pending' ? (
            <div className="text-center py-3">
              <div className="text-amber-500 text-sm mb-2">영상 생성 진행 중... (30초~1분 소요)</div>
              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div className="w-1/2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          ) : sceneWithVideo.videoStatus === 'completed' && sceneWithVideo.thumbnailUrl ? (
            <div className="flex items-center space-x-4">
              <div className="relative w-32 bg-gray-100 rounded overflow-hidden">
                <div className="aspect-[9/16] w-full">
                  <img 
                    src={sceneWithVideo.thumbnailUrl} 
                    alt="영상 썸네일" 
                    className="w-full h-full object-contain"
                  />
                  <a 
                    href={sceneWithVideo.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-40"
                  >
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"></path>
                      </svg>
                    </div>
                  </a>
                </div>
              </div>
              <div>
                <div className="font-medium">세로형 영상 (9:16)</div>
                <a 
                  href={sceneWithVideo.videoUrl}
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
          ) : sceneWithVideo.videoStatus === 'failed' ? (
            <div className="text-center py-3 text-red-500">
              영상 생성 중 오류가 발생했습니다. 다시 시도해 주세요.
            </div>
          ) : (
            <div className="py-2 text-sm text-gray-500">영상 프롬프트를 생성한 후 영상을 생성하세요.</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SceneCard