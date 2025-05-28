import React, { useState, useEffect } from 'react'
import { Scene, SceneWithVideo } from '../types'
import VideoProgress from './VideoProgress'

interface SceneCardProps {
  scene: Scene;
  onUpdateText: (sceneId: number, newText: string) => void;
  onGenerateImagePrompt: (sceneId: number) => Promise<void>;
  onGenerateImages: (sceneId: number) => Promise<void>;
  onSelectImage: (sceneId: number, imageIndex: number) => void;
  onGenerateVideoPrompt: (sceneId: number) => Promise<void>;
  onGenerateVideo: (sceneId: number) => Promise<void>;
}

const SceneCard: React.FC<SceneCardProps> = ({ 
  scene, 
  onUpdateText, 
  onGenerateImagePrompt, 
  onGenerateImages, 
  onSelectImage,
  onGenerateVideoPrompt,
  onGenerateVideo
}) => {
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
    onUpdateText(scene.id, text)
  }

  // 씬 타입 캐스팅
  const sceneWithVideo = scene as SceneWithVideo

  // 비디오 상태에 따른 렌더링
  const renderVideoSection = () => {
    if (sceneWithVideo.loadingVideo) {
      return <div className="py-2 text-sm text-gray-500">영상 생성 요청 처리 중...</div>
    }

    if (sceneWithVideo.videoStatus === 'pending') {
      return <VideoProgress scene={sceneWithVideo} />
    }

    if (sceneWithVideo.videoStatus === 'completed' && sceneWithVideo.thumbnailUrl) {
      return (
        <div className="flex items-center space-x-4">
          <div className="relative w-32 bg-gray-100 rounded overflow-hidden">
            <div className="aspect-[9/16] w-full overflow-hidden">
              <img 
                src={sceneWithVideo.thumbnailUrl} 
                alt="영상 썸네일" 
                className="w-full h-full object-contain"
              />
            </div>
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
          <div>
            <div className="font-medium">세로형 영상 (9:16)</div>
            <a
              href={sceneWithVideo.videoUrl || '#'} 
              download={`scene_${scene.id}_video.mp4`}
              className="text-blue-500 text-sm hover:underline flex items-center mt-1"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              다운로드
            </a>
          </div>
        </div>
      )
    }

    if (sceneWithVideo.videoStatus === 'failed') {
      return (
        <div className="text-center py-3 text-red-500">
          영상 생성 중 오류가 발생했습니다. 다시 시도해 주세요.
        </div>
      )
    }

    return (
      <div className="py-2 text-sm text-gray-500">영상 프롬프트를 생성한 후 영상을 생성하세요.</div>
    )
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      {/* 씬 내용 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">씬 내용</label>
        <textarea 
          value={text} 
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          className="w-full border border-gray-300 rounded-md p-3 h-24 focus:border-indigo-500 focus:ring-indigo-500"
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
              onClick={() => onGenerateImagePrompt(scene.id)}
              disabled={!text.trim() || scene.loadingImagePrompt}
              className={`px-4 py-1 rounded-md text-sm ${
                !text.trim() || scene.loadingImagePrompt
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {scene.loadingImagePrompt ? '생성중...' : '생성하기'}
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
              onClick={() => onGenerateImages(scene.id)}
              disabled={!scene.imagePrompt || scene.loadingImages}
              className={`px-4 py-1 rounded-md text-sm ${
                !scene.imagePrompt || scene.loadingImages
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {scene.loadingImages ? '생성중...' : '이미지 생성'}
            </button>
          </div>
          
          {scene.loadingImages ? (
            <div className="py-2 text-sm text-gray-500">이미지 생성 중...</div>
          ) : scene.images && scene.images.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {scene.images.map((image, idx) => (
                <div 
                  key={idx}
                  onClick={() => onSelectImage(scene.id, idx)}
                  className={`relative cursor-pointer rounded-md overflow-hidden ${
                    scene.selectedImageIndex === idx ? 'ring-2 ring-indigo-500' : ''
                  }`}
                >
                  <div className="aspect-[9/16] w-full">
                    <img 
                      src={image} 
                      alt={`Option ${idx + 1}`} 
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {scene.selectedImageIndex === idx && (
                    <div className="absolute top-2 right-2 bg-indigo-500 rounded-full w-6 h-6 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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
              onClick={() => onGenerateVideoPrompt(scene.id)}
              disabled={!scene.selectedImage || scene.loadingVideoPrompt}
              className={`px-4 py-1 rounded-md text-sm ${
                !scene.selectedImage || scene.loadingVideoPrompt
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {scene.loadingVideoPrompt ? '생성중...' : '프롬프트 생성'}
            </button>
          </div>
          
          {scene.loadingVideoPrompt ? (
            <div className="py-2 text-sm text-gray-500">영상 프롬프트 생성 중...</div>
          ) : scene.videoPrompt ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">영상 프롬프트</label>
                <div className="bg-gray-50 p-3 rounded border border-gray-100 min-h-[100px]">
                  {scene.videoPrompt}
                </div>
              </div>
              {scene.negativePrompt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Negative Prompt</label>
                  <div className="bg-gray-50 p-3 rounded border border-gray-100 min-h-[100px]">
                    {scene.negativePrompt}
                  </div>
                </div>
              )}
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
              onClick={() => onGenerateVideo(scene.id)}
              disabled={!scene.videoPrompt || !scene.selectedImage}
              className={`px-4 py-1 rounded-md text-sm ${
                scene.videoPrompt && scene.selectedImage
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              영상 생성
            </button>
          </div>
          
          {renderVideoSection()}
        </div>
      </div>
    </div>
  )
}

export default SceneCard