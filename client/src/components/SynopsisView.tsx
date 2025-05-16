import React, { useState, useEffect } from 'react'
import { useSceneStore } from '../store/sceneStore'
import SynopsisForm from './SynopsisForm'
import SceneCard from './SceneCard'
import SceneNavigation from './SceneNavigation'
import VideoProgress from './VideoProgress'
import { Scene, SceneWithVideo } from '../types'
import { useToast } from '../hooks/use-toast'

// Mock data arrays for demo purposes
const sceneStarters = [
  "주인공이 어두운 숲속에서 길을 잃고 방황하고 있다.",
  "도시의 번화가에서 주인공은 수상한 남자를 발견한다.",
  "해변가에서 주인공은 바다에 떠다니는 이상한 물체를 발견한다.",
  "어두운 골목에서 주인공은 쫓기고 있다.",
  "고요한 호수가에서 주인공은 물에 반사된 이상한 형체를 본다.",
  "높은 빌딩 옥상에서 주인공은 도시를 내려다보고 있다.",
  "방치된 창고에서 주인공은 비밀 문서를 발견한다.",
  "비가 내리는 거리에서 주인공은 우산을 쓴 낯선 인물을 마주친다.",
  "눈 덮인 산속에서 주인공은 발자국을 따라가고 있다.",
  "혼잡한 기차역에서 주인공은 중요한 가방을 놓치게 된다."
]

const movieImages = [
  "https://images.unsplash.com/photo-1516214104703-d870798883c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Forest
  "https://images.unsplash.com/photo-1620332372374-f108c53d2e03?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // City night
  "https://images.unsplash.com/photo-1590523278191-995cbcda646b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Beach
  "https://images.unsplash.com/photo-1483653364400-eedcfb9f1f88?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" // Dark alley
]

const styleDescriptors = [
  "cinematic lighting, detailed, high definition, 8K",
  "dramatic composition, movie still, professional photography"
]

const videoPrompts = [
  "A cinematic sequence showing the scene with dramatic lighting and atmosphere. Camera slowly moves from left to right, revealing the scene details. Depth of field effect with background slightly blurred.",
  "High-definition video capture of the scene. Camera starts with a wide establishing shot and gradually zooms in on the main subject. Natural lighting with golden hour warm tones."
]

const negativePrompts = [
  "low quality, blurry, distorted, pixelated, low resolution, oversaturated, amateur footage, shaky camera, out of focus, poor lighting",
  "text overlay, watermarks, logos, timestamps, jerky movement, digital artifacts, noise, grain, dust, scratches, stains"
]

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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (synopsis.trim()) {
      setStep('processing')
      
      try {
        // 실제 API 호출
        const response = await fetch('/api/parse-scenes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            synopsis: synopsis,
            scene_count: sceneCount
          })
        })
        
        if (!response.ok) {
          throw new Error('API 호출 중 오류가 발생했습니다.')
        }
        
        const parsedScenes = await response.json()
        
        // 응답 데이터를 Scene 타입에 맞게 변환
        const formattedScenes = parsedScenes.map((scene: any) => ({
          id: scene.id,
          text: scene.text,
          order: scene.order,
          imagePrompt: '',
          images: [],
          selectedImageIndex: null,
          selectedImage: null,
          videoPrompt: '',
          negativePrompt: '',
          loadingImagePrompt: false,
          loadingImages: false,
          loadingVideoPrompt: false
        }))
        
        setScenes(formattedScenes)
        setActiveSceneIndex(0)
        setStep('scenes')
      } catch (error) {
        console.error('씬 분석 중 오류 발생:', error)
        // 오류 시 모의 데이터로 폴백 (실제 환경에서는 오류 메시지 표시)
        alert('씬 분석 중 오류가 발생했습니다. 관리자에게 문의하세요.')
        
        // 임시 폴백 코드 (개발 목적)
        const mockScenes = Array.from({ length: sceneCount }, (_, i) => ({
          id: i + 1,
          text: `씬 ${i + 1}: API 오류로 인해 임시 데이터를 표시합니다.`,
          order: i + 1,
          imagePrompt: '',
          images: [],
          selectedImageIndex: null,
          selectedImage: null,
          videoPrompt: '',
          negativePrompt: '',
          loadingImagePrompt: false,
          loadingImages: false,
          loadingVideoPrompt: false
        }))
        
        setScenes(mockScenes)
        setActiveSceneIndex(0)
        setStep('scenes')
      }
    }
  }
  
  // Update scene text
  const updateSceneText = (sceneId: number, newText: string) => {
    setScenes(prevScenes => 
      prevScenes.map(scene => 
        scene.id === sceneId ? { ...scene, text: newText } : scene
      )
    )
  }
  
  // Generate image prompt for a scene
  const generateImagePrompt = async (sceneId: number) => {
    // Set loading state
    setScenes(prevScenes => 
      prevScenes.map(scene => 
        scene.id === sceneId ? { ...scene, loadingImagePrompt: true } : scene
      )
    )
    
    try {
      const scene = scenes.find(s => s.id === sceneId)
      if (!scene) return
      
      // 실제 API 호출
      const response = await fetch('/api/generate-image-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scene_text: scene.text
        })
      })
      
      if (!response.ok) {
        throw new Error('이미지 프롬프트 생성 중 오류가 발생했습니다.')
      }
      
      const data = await response.json()
      
      setScenes(prevScenes => 
        prevScenes.map(scene => 
          scene.id === sceneId ? { 
            ...scene, 
            imagePrompt: data.prompt,
            loadingImagePrompt: false 
          } : scene
        )
      )
    } catch (error) {
      console.error('이미지 프롬프트 생성 중 오류:', error)
      
      // 오류 발생 시 로딩 상태 해제
      setScenes(prevScenes => 
        prevScenes.map(scene => 
          scene.id === sceneId ? { ...scene, loadingImagePrompt: false } : scene
        )
      )
      
      alert('이미지 프롬프트 생성 중 오류가 발생했습니다.')
    }
  }
  
  // Generate images for a scene
  const generateImages = async (sceneId: number) => {
    const scene = scenes.find(s => s.id === sceneId)
    if (!scene || !scene.imagePrompt) return
    
    // Set loading state
    setScenes(prevScenes => 
      prevScenes.map(s => 
        s.id === sceneId ? { ...s, loadingImages: true } : s
      )
    )
    
    try {
      // 실제 API 호출
      const response = await fetch('/api/generate-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: scene.imagePrompt
        })
      })
      
      if (!response.ok) {
        throw new Error('이미지 생성 중 오류가 발생했습니다.')
      }
      
      const data = await response.json()
      
      setScenes(prevScenes => 
        prevScenes.map(s => 
          s.id === sceneId ? { 
            ...s, 
            images: data.images,
            loadingImages: false 
          } : s
        )
      )
    } catch (error) {
      console.error('이미지 생성 중 오류:', error)
      
      // 오류 발생 시 로딩 상태 해제
      setScenes(prevScenes => 
        prevScenes.map(s => 
          s.id === sceneId ? { ...s, loadingImages: false } : s
        )
      )
      
      alert('이미지 생성 중 오류가 발생했습니다.')
    }
  }
  
  // Select an image for a scene
  const selectImage = (sceneId: number, imageIndex: number) => {
    const scene = scenes.find(s => s.id === sceneId)
    if (!scene || !scene.images || imageIndex >= scene.images.length) return
    
    const selectedImage = scene.images[imageIndex]
    
    setScenes(prevScenes => 
      prevScenes.map(s => 
        s.id === sceneId ? { 
          ...s, 
          selectedImageIndex: imageIndex,
          selectedImage
        } : s
      )
    )
  }
  
  // Generate video prompt for a scene
  const generateVideoPrompt = async (sceneId: number) => {
    const scene = scenes.find(s => s.id === sceneId)
    if (!scene || !scene.selectedImage) return
    
    // Set loading state
    setScenes(prevScenes => 
      prevScenes.map(s => 
        s.id === sceneId ? { ...s, loadingVideoPrompt: true } : s
      )
    )
    
    try {
      // 실제 API 호출
      const response = await fetch('/api/describe-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_url: scene.selectedImage
        })
      })
      
      if (!response.ok) {
        throw new Error('영상 프롬프트 생성 중 오류가 발생했습니다.')
      }
      
      const data = await response.json()
      
      setScenes(prevScenes => 
        prevScenes.map(s => 
          s.id === sceneId ? { 
            ...s, 
            videoPrompt: data.video_prompt,
            negativePrompt: data.negative_prompt,
            loadingVideoPrompt: false 
          } : s
        )
      )
    } catch (error) {
      console.error('영상 프롬프트 생성 중 오류:', error)
      
      // 오류 발생 시 로딩 상태 해제
      setScenes(prevScenes => 
        prevScenes.map(s => 
          s.id === sceneId ? { ...s, loadingVideoPrompt: false } : s
        )
      )
      
      alert('영상 프롬프트 생성 중 오류가 발생했습니다.')
    }
  }
  
  // Generate video for a scene
  const generateVideo = async (sceneId: number) => {
    const scene = scenes.find(s => s.id === sceneId)
    if (!scene || !scene.videoPrompt || !scene.selectedImage) return
    
    console.log('영상 생성 요청 시작:', sceneId, scene.videoPrompt?.slice(0, 20))
    
    // Set loading state - 명시적으로 모든 필드 초기화
    setScenes(prevScenes => 
      prevScenes.map(s => 
        s.id === sceneId ? { 
          ...s, 
          loadingVideo: true,
          videoRequestId: undefined,
          videoStatus: undefined,
          videoUrl: undefined,
          thumbnailUrl: undefined
        } as SceneWithVideo : s
      )
    )
    
    try {
      console.log('영상 생성 API 호출:', scene.selectedImage?.slice(0, 30))
      
      // 실제 API 호출
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_url: scene.selectedImage,
          video_prompt: scene.videoPrompt,
          negative_prompt: scene.negativePrompt || ''
        })
      })
      
      if (!response.ok) {
        throw new Error('영상 생성 요청 중 오류가 발생했습니다.')
      }
      
      const data = await response.json()
      console.log('영상 생성 응답 성공:', data)
      
      // 영상 생성 요청 성공 - 명시적으로 모든 필드 업데이트
      const updatedScenes = (prevScenes: Scene[]) => {
        const newScenes = [...prevScenes]
        const sceneIndex = newScenes.findIndex(s => s.id === sceneId)
        
        if (sceneIndex >= 0) {
          newScenes[sceneIndex] = {
            ...newScenes[sceneIndex],
            loadingVideo: false,
            videoRequestId: data.request_id,
            videoStatus: 'pending'
          } as SceneWithVideo
        }
        
        console.log('영상 생성 상태 업데이트:', newScenes[sceneIndex])
        return newScenes
      }
      
      setScenes(updatedScenes)
      
      // 디버깅을 위해 바로 현재 상태 확인
      console.log('영상 상태 확인 설정됨. 3초 후 실행')
      
      // 비디오 상태 주기적으로 확인 시작 - 직접 request_id 전달
      setTimeout(() => {
        console.log('영상 상태 확인 타이머 실행')
        // 상태 변경 후 직접 상태 확인 (scenes 상태가 불확실할 수 있음)
        checkVideoStatusDirect(sceneId, data.request_id)
      }, 3000)
      
    } catch (error) {
      console.error('영상 생성 요청 중 오류:', error)
      
      // 오류 발생 시 로딩 상태 해제
      setScenes(prevScenes => 
        prevScenes.map(s => 
          s.id === sceneId ? { 
            ...s, 
            loadingVideo: false,
            videoStatus: 'failed'
          } : s
        )
      )
      
      alert('영상 생성 요청 중 오류가 발생했습니다.')
    }
  }
  
  // 직접 request_id를 사용하는 상태 확인 함수
  const checkVideoStatusDirect = async (sceneId: number, requestId: string) => {
    console.log('직접 비디오 상태 확인 시작:', sceneId, requestId)
    
    try {
      // 실제 API 호출
      const response = await fetch('/api/check-video-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request_id: requestId
        })
      })
      
      if (!response.ok) {
        throw new Error('영상 상태 확인 중 오류가 발생했습니다.')
      }
      
      const data = await response.json()
      console.log('직접 비디오 상태 확인 응답:', data)
      
      if (data.status === 'completed') {
        // 영상 생성 완료
        console.log('비디오 생성 완료!', data.video_url)
        setScenes(prevScenes => 
          prevScenes.map(s => 
            s.id === sceneId ? { 
              ...s, 
              videoStatus: 'completed',
              videoUrl: data.video_url,
              thumbnailUrl: data.thumbnail_url
            } : s
          )
        )
      } else if (data.status === 'failed') {
        // 영상 생성 실패
        console.log('비디오 생성 실패')
        setScenes(prevScenes => 
          prevScenes.map(s => 
            s.id === sceneId ? { 
              ...s, 
              videoStatus: 'failed'
            } : s
          )
        )
      } else {
        // 아직 처리 중, 계속 상태 확인
        console.log('비디오 생성 아직 진행 중, 3초 후 다시 확인')
        setTimeout(() => checkVideoStatusDirect(sceneId, requestId), 3000)
      }
      
    } catch (error) {
      console.error('영상 상태 확인 중 오류:', error)
      
      // 오류가 발생해도 재시도
      console.log('비디오 상태 확인 오류, 5초 후 재시도')
      setTimeout(() => checkVideoStatusDirect(sceneId, requestId), 5000)
    }
  }
  
  // Check video generation status
  const checkVideoStatus = async (sceneId: number) => {
    const scene = scenes.find(s => s.id === sceneId)
    if (!scene) return
    
    // 비디오 관련 속성을 사용하기 위해 타입 캐스팅
    const sceneWithVideo = scene as SceneWithVideo
    
    // 디버깅을 위한 로그 추가
    console.log('비디오 상태 확인 시작:', sceneId, sceneWithVideo.videoRequestId, sceneWithVideo.videoStatus)
    
    // 요청 ID가 없거나 pending 상태가 아니면 확인 중단
    if (!sceneWithVideo.videoRequestId || sceneWithVideo.videoStatus !== 'pending') {
      console.log('비디오 상태 확인 중단: 조건 불일치', sceneWithVideo.videoRequestId, sceneWithVideo.videoStatus)
      return
    }
    
    try {
      console.log('비디오 상태 확인 API 호출:', sceneWithVideo.videoRequestId)
      
      // 실제 API 호출
      const response = await fetch('/api/check-video-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request_id: sceneWithVideo.videoRequestId
        })
      })
      
      if (!response.ok) {
        throw new Error('영상 상태 확인 중 오류가 발생했습니다.')
      }
      
      const data = await response.json()
      console.log('비디오 상태 확인 응답:', data)
      
      if (data.status === 'completed') {
        // 영상 생성 완료
        console.log('비디오 생성 완료!', data.video_url)
        setScenes(prevScenes => 
          prevScenes.map(s => 
            s.id === sceneId ? { 
              ...s, 
              videoStatus: 'completed',
              videoUrl: data.video_url,
              thumbnailUrl: data.thumbnail_url
            } : s
          )
        )
      } else if (data.status === 'failed') {
        // 영상 생성 실패
        console.log('비디오 생성 실패')
        setScenes(prevScenes => 
          prevScenes.map(s => 
            s.id === sceneId ? { 
              ...s, 
              videoStatus: 'failed'
            } : s
          )
        )
      } else {
        // 아직 처리 중, 계속 상태 확인
        console.log('비디오 생성 아직 진행 중, 3초 후 다시 확인')
        setTimeout(() => checkVideoStatus(sceneId), 3000)
      }
      
    } catch (error) {
      console.error('영상 상태 확인 중 오류:', error)
      
      // 오류가 발생해도 재시도
      console.log('비디오 상태 확인 오류, 5초 후 재시도')
      setTimeout(() => checkVideoStatus(sceneId), 5000)
    }
  }
  
  // Download JSON output
  const downloadJSON = () => {
    const completedScenes = scenes.filter(scene => scene.videoPrompt)
    if (completedScenes.length === 0) return
    
    const output = completedScenes.map(scene => ({
      scene_id: scene.id,
      scene_text: scene.text,
      image_prompt: scene.imagePrompt || '',
      selected_image: scene.selectedImage || '',
      video_prompt: scene.videoPrompt || '',
      negative_prompt: scene.negativePrompt || ''
    }))
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(output, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "video_prompts.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }
  
  // Move scene navigation
  const moveToScene = (index: number) => {
    if (index >= 0 && index < scenes.length) {
      setActiveSceneIndex(index)
    }
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header with Progress Bar */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-800">시놉시스 기반 영상 제작 자동화</h1>
            
            {step === 'scenes' && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">진행률: {getProgressPercentage()}%</span>
                <div className="w-32 bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
                <button 
                  onClick={downloadJSON}
                  disabled={!scenes.some(s => s.videoPrompt)}
                  className={`px-3 py-1 rounded-md text-sm font-medium text-white ${
                    scenes.some(s => s.videoPrompt) 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  JSON 다운로드
                </button>
              </div>
            )}
          </div>
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 h-40 border"
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
          
          {/* Scenes View with Navigation */}
          {step === 'scenes' && (
            <div className="space-y-6">
              {/* Scene Navigation */}
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">씬 편집</h2>
                  <button 
                    onClick={() => setStep('input')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    시놉시스로 돌아가기
                  </button>
                </div>
                
                <div className="flex overflow-x-auto space-x-2 pb-2">
                  {scenes.map((scene, index) => (
                    <div 
                      key={scene.id}
                      onClick={() => setActiveSceneIndex(index)}
                      className={`flex-shrink-0 cursor-pointer p-3 rounded-md border ${
                        activeSceneIndex === index 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-24 flex flex-col items-center">
                        <div className="font-medium text-gray-700 mb-1">씬 {index + 1}</div>
                        <div className="flex mt-1">
                          <span className={`w-2 h-2 rounded-full ${scene.imagePrompt ? 'bg-green-500' : 'bg-gray-300'} mx-0.5`}></span>
                          <span className={`w-2 h-2 rounded-full ${scene.images?.length ? 'bg-green-500' : 'bg-gray-300'} mx-0.5`}></span>
                          <span className={`w-2 h-2 rounded-full ${scene.selectedImage ? 'bg-green-500' : 'bg-gray-300'} mx-0.5`}></span>
                          <span className={`w-2 h-2 rounded-full ${scene.videoPrompt ? 'bg-green-500' : 'bg-gray-300'} mx-0.5`}></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Active Scene Card */}
              {activeSceneIndex !== null && scenes[activeSceneIndex] && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">씬 {activeSceneIndex + 1}</h3>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => moveToScene(activeSceneIndex - 1)}
                        disabled={activeSceneIndex === 0}
                        className={`p-1 rounded ${activeSceneIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => moveToScene(activeSceneIndex + 1)}
                        disabled={activeSceneIndex === scenes.length - 1}
                        className={`p-1 rounded ${activeSceneIndex === scenes.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Scene Text Editor */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">씬 내용</label>
                    <textarea 
                      value={scenes[activeSceneIndex].text} 
                      onChange={(e) => updateSceneText(scenes[activeSceneIndex].id, e.target.value)}
                      className="w-full border border-gray-300 rounded-md shadow-sm px-4 py-2 h-24 focus:border-blue-500 focus:ring-blue-500"
                    ></textarea>
                  </div>
                  
                  {/* Workflow Steps */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Step 1: Image Prompt */}
                    <div className="border border-gray-200 rounded-md p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-800">1. 이미지 프롬프트</h4>
                        <button 
                          onClick={() => generateImagePrompt(scenes[activeSceneIndex].id)}
                          disabled={!scenes[activeSceneIndex].text.trim() || scenes[activeSceneIndex].loadingImagePrompt}
                          className={`px-2 py-1 rounded-md text-xs font-medium ${
                            !scenes[activeSceneIndex].text.trim() || scenes[activeSceneIndex].loadingImagePrompt 
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {scenes[activeSceneIndex].loadingImagePrompt ? '생성중...' : '생성하기'}
                        </button>
                      </div>
                      
                      {/* Prompt Display */}
                      {scenes[activeSceneIndex].imagePrompt && (
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-sm text-gray-700 font-mono">{scenes[activeSceneIndex].imagePrompt}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Step 2: Generate & Select Images */}
                    <div className="border border-gray-200 rounded-md p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-800">2. 이미지 생성 및 선택</h4>
                        <button 
                          onClick={() => generateImages(scenes[activeSceneIndex].id)}
                          disabled={!scenes[activeSceneIndex].imagePrompt || scenes[activeSceneIndex].loadingImages}
                          className={`px-2 py-1 rounded-md text-xs font-medium ${
                            !scenes[activeSceneIndex].imagePrompt || scenes[activeSceneIndex].loadingImages 
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {scenes[activeSceneIndex].loadingImages ? '생성중...' : '이미지 생성'}
                        </button>
                      </div>
                      
                      {/* Images Display */}
                      {scenes[activeSceneIndex].images && scenes[activeSceneIndex].images.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {scenes[activeSceneIndex].images.map((image, idx) => (
                            <div 
                              key={idx}
                              onClick={() => selectImage(scenes[activeSceneIndex].id, idx)}
                              className={`relative cursor-pointer rounded-md overflow-hidden ${
                                scenes[activeSceneIndex].selectedImageIndex === idx ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                              }`}
                            >
                              <div className="aspect-[9/16] w-full flex items-center justify-center bg-gray-50">
                                <div className="h-full w-full">
                                  <img 
                                    src={image} 
                                    alt={`Scene ${activeSceneIndex + 1} option ${idx + 1}`} 
                                    className="h-full w-full object-contain"
                                    style={{ maxHeight: '100%', maxWidth: '100%' }}
                                  />
                                </div>
                              </div>
                              {scenes[activeSceneIndex].selectedImageIndex === idx && (
                                <div className="absolute top-1 right-1 bg-blue-500 rounded-full w-5 h-5 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Step 3: Video Prompt Generation */}
                    <div className="border border-gray-200 rounded-md p-4 md:col-span-2">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-800">3. 영상 프롬프트 생성</h4>
                        <button 
                          onClick={() => generateVideoPrompt(scenes[activeSceneIndex].id)}
                          disabled={!scenes[activeSceneIndex].selectedImage || scenes[activeSceneIndex].loadingVideoPrompt}
                          className={`px-2 py-1 rounded-md text-xs font-medium ${
                            !scenes[activeSceneIndex].selectedImage || scenes[activeSceneIndex].loadingVideoPrompt 
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {scenes[activeSceneIndex].loadingVideoPrompt ? '생성중...' : '프롬프트 생성'}
                        </button>
                      </div>
                      
                      {/* Video Prompt Display */}
                      {scenes[activeSceneIndex].videoPrompt && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">영상 프롬프트</label>
                            <div className="bg-gray-50 p-3 rounded-md h-32 overflow-y-auto">
                              <p className="text-sm text-gray-700 font-mono">{scenes[activeSceneIndex].videoPrompt}</p>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Negative Prompt</label>
                            <div className="bg-gray-50 p-3 rounded-md h-32 overflow-y-auto">
                              <p className="text-sm text-gray-700 font-mono">{scenes[activeSceneIndex].negativePrompt}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  
                    {/* Step 4: Video Generation */}
                    <div className="border border-gray-200 rounded-md p-4 md:col-span-2 mt-6">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-800">4. 영상 생성</h4>
                        <button 
                          onClick={() => generateVideo(scenes[activeSceneIndex].id)}
                          disabled={!scenes[activeSceneIndex].videoPrompt || !scenes[activeSceneIndex].selectedImage}
                          className={`px-4 py-1 rounded-md text-xs font-medium ${
                            scenes[activeSceneIndex].videoPrompt && scenes[activeSceneIndex].selectedImage
                              ? 'bg-blue-600 text-white hover:bg-blue-700' 
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          영상 생성
                        </button>
                      </div>
                      
                      {/* Video Generation Status */}
                      {(scenes[activeSceneIndex] as SceneWithVideo).loadingVideo ? (
                        <div className="flex items-center text-gray-500 text-sm py-2">
                          <span>영상 생성 요청 처리 중...</span>
                        </div>
                      ) : (scenes[activeSceneIndex] as SceneWithVideo).videoStatus === 'pending' ? (
                        <div className="text-center py-3">
                          <VideoProgress scene={scenes[activeSceneIndex] as SceneWithVideo} />
                        </div>
                      ) : (scenes[activeSceneIndex] as SceneWithVideo).videoStatus === 'completed' && (scenes[activeSceneIndex] as SceneWithVideo).thumbnailUrl ? (
                        <div className="flex items-center space-x-4">
                          <div className="relative w-32 bg-gray-100 rounded overflow-hidden">
                            <div className="aspect-[9/16] w-full overflow-hidden">
                              <img 
                                src={(scenes[activeSceneIndex] as SceneWithVideo).thumbnailUrl} 
                                alt="영상 썸네일" 
                                className="w-full h-full object-contain"
                                style={{ maxHeight: '100%', maxWidth: '100%' }}
                              />
                            </div>
                            <a 
                              href={(scenes[activeSceneIndex] as SceneWithVideo).videoUrl} 
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
                            <button 
                              onClick={async () => {
                                try {
                                  const success = await useSceneStore.getState().downloadVideo(
                                    (scenes[activeSceneIndex] as SceneWithVideo).videoUrl || '', 
                                    `scene_${scenes[activeSceneIndex].id}_video.mp4`
                                  );
                                  // 성공/실패 메시지는 콘솔에 표시
                                  if (success) {
                                    console.log('영상이 다운로드되었습니다.');
                                  } else {
                                    console.error('영상 다운로드 중 오류가 발생했습니다.');
                                  }
                                } catch (error) {
                                  console.error('다운로드 오류:', error);
                                }
                              }}
                              className="text-blue-500 text-sm hover:underline flex items-center mt-1"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              다운로드
                            </button>
                          </div>
                        </div>
                      ) : (scenes[activeSceneIndex] as SceneWithVideo).videoStatus === 'failed' ? (
                        <div className="text-center py-3 text-red-500">
                          영상 생성 중 오류가 발생했습니다. 다시 시도해 주세요.
                        </div>
                      ) : (
                        <div className="py-2 text-sm text-gray-500">
                          영상 프롬프트를 생성한 후 영상을 생성하세요.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
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