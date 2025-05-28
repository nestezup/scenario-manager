import React, { useState, useEffect } from 'react'
import { Scene, SceneWithVideo } from '../types'
import SynopsisForm from './SynopsisForm'
import SceneCard from './SceneCard'
import SceneNavigation from './SceneNavigation'
import VideoProgress from './VideoProgress'
import Header from './Header'
import InsufficientCreditsModal from './InsufficientCreditsModal'
import { useToast } from '../hooks/use-toast'
import useApiWithCredits from '../hooks/useApiWithCredits'
import { useAuth } from '../contexts/AuthContext'

// Credit costs for different operations
const CREDIT_COSTS = {
  IMAGE_GENERATION: 15, // 3개 이미지 생성 (5 x 3)
  PROMPT_GENERATION: 5,
  VIDEO_GENERATION: 10,
  SCENE_PARSING: 5
};

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
  const [sceneCount, setSceneCount] = useState(5)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [activeSceneIndex, setActiveSceneIndex] = useState<number | null>(null)
  const [showInsufficientCreditsModal, setShowInsufficientCreditsModal] = useState(false)
  const [requiredCredits, setRequiredCredits] = useState(0)
  const [currentOperation, setCurrentOperation] = useState('')
  const { user, updateCredits } = useAuth()
  
  // useEffect to handle scenes state changes
  useEffect(() => {
    if (scenes.length > 0) {
      if (step !== 'scenes') {
        setStep('scenes');
      }
      if (activeSceneIndex === null) {
        setActiveSceneIndex(0);
      }
    }
  }, [scenes]);
  
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
        
        if (response.status === 402) {
          // Insufficient credits
          setRequiredCredits(CREDIT_COSTS.SCENE_PARSING);
          setCurrentOperation('scene parsing');
          setShowInsufficientCreditsModal(true);
          setStep('input');
          return;
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API 호출 중 오류가 발생했습니다. (${response.status})`);
        }
        
        const data = await response.json()
        
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('유효하지 않은 씬 데이터를 받았습니다.');
        }
        
        setScenes(data)
        
        // Use setTimeout to ensure state updates are processed
        setTimeout(() => {
          setStep('scenes');
          setActiveSceneIndex(0);
        }, 50);
        
        // 즉시 크레딧 업데이트 (서버에서 차감된 만큼 반영)
        if (user) {
          updateCredits(user.credits - CREDIT_COSTS.SCENE_PARSING);
        }
      } catch (error) {
        alert('씬 분석 중 오류가 발생했습니다. 관리자에게 문의하세요.')
        
        setStep('input')
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
      
      if (response.status === 402) {
        // Insufficient credits
        setRequiredCredits(CREDIT_COSTS.PROMPT_GENERATION);
        setCurrentOperation('image prompt generation');
        setShowInsufficientCreditsModal(true);
        
        // Reset loading state
        setScenes(prevScenes => 
          prevScenes.map(scene => 
            scene.id === sceneId ? { ...scene, loadingImagePrompt: false } : scene
          )
        )
        return;
      }
      
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
      
      // 즉시 크레딧 업데이트 (서버에서 차감된 만큼 반영)
      if (user) {
        updateCredits(user.credits - CREDIT_COSTS.PROMPT_GENERATION);
      }
    } catch (error) {
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
      
      if (response.status === 402) {
        // Insufficient credits
        setRequiredCredits(CREDIT_COSTS.IMAGE_GENERATION);
        setCurrentOperation('image generation');
        setShowInsufficientCreditsModal(true);
        
        // Reset loading state
        setScenes(prevScenes => 
          prevScenes.map(s => 
            s.id === sceneId ? { ...s, loadingImages: false } : s
          )
        )
        return;
      }
      
      if (!response.ok) {
        throw new Error('이미지 생성 중 오류가 발생했습니다.')
      }
      
      const data = await response.json()
      
      // Update the scene with the generated images
      setScenes(prevScenes => 
        prevScenes.map(scene => 
          scene.id === sceneId 
            ? { ...scene, images: data.images, loadingImages: false }
            : scene
        )
      )
      
      // 즉시 크레딧 업데이트 (서버에서 차감된 만큼 반영)
      if (user) {
        updateCredits(user.credits - CREDIT_COSTS.IMAGE_GENERATION);
      }
    } catch (error) {
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
      
      if (response.status === 402) {
        // Insufficient credits
        const errorData = await response.json();
        setRequiredCredits(CREDIT_COSTS.PROMPT_GENERATION);
        setCurrentOperation('video prompt generation');
        setShowInsufficientCreditsModal(true);
        
        // Reset loading state
        setScenes(prevScenes => 
          prevScenes.map(s => 
            s.id === sceneId ? { ...s, loadingVideoPrompt: false } : s
          )
        )
        return;
      }
      
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
      
      // 즉시 크레딧 업데이트 (서버에서 차감된 만큼 반영)
      if (user) {
        updateCredits(user.credits - CREDIT_COSTS.PROMPT_GENERATION);
      }
    } catch (error) {
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
        
        return newScenes
      }
      
      setScenes(updatedScenes)
      
      // 비디오 상태 주기적으로 확인 시작 - 직접 request_id 전달
      setTimeout(() => {
        // 상태 변경 후 직접 상태 확인 (scenes 상태가 불확실할 수 있음)
        checkVideoStatusDirect(sceneId, data.request_id)
      }, 3000)
      
      // 즉시 크레딧 업데이트 (서버에서 차감된 만큼 반영)
      if (user) {
        updateCredits(user.credits - CREDIT_COSTS.VIDEO_GENERATION);
      }
      
    } catch (error) {
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
      
      if (data.status === 'completed') {
        // 영상 생성 완료
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
        setTimeout(() => checkVideoStatusDirect(sceneId, requestId), 3000)
      }
      
    } catch (error) {
      // 오류가 발생해도 재시도
      setTimeout(() => checkVideoStatusDirect(sceneId, requestId), 5000)
    }
  }
  
  // Check video generation status
  const checkVideoStatus = async (sceneId: number) => {
    const scene = scenes.find(s => s.id === sceneId)
    if (!scene) return
    
    // 비디오 관련 속성을 사용하기 위해 타입 캐스팅
    const sceneWithVideo = scene as SceneWithVideo
    
    // 요청 ID가 없거나 pending 상태가 아니면 확인 중단
    if (!sceneWithVideo.videoRequestId || sceneWithVideo.videoStatus !== 'pending') {
      return
    }
    
    try {
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
      
      if (data.status === 'completed') {
        // 영상 생성 완료
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
        setTimeout(() => checkVideoStatus(sceneId), 3000)
      }
      
    } catch (error) {
      // 오류가 발생해도 재시도
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {step === 'input' && (
          <SynopsisForm 
            synopsis={synopsis} 
            setSynopsis={setSynopsis} 
            sceneCount={sceneCount}
            setSceneCount={setSceneCount}
            onSubmit={handleSubmit}
          />
        )}
        
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="mt-4 text-lg text-gray-700">씬을 분석하고 있습니다...</p>
          </div>
        )}
        
        {step === 'scenes' && scenes.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">씬 편집</h2>
              <div className="text-sm text-gray-500">
                진행률: {getProgressPercentage()}%
              </div>
            </div>
            
            <SceneNavigation 
              scenes={scenes}
              activeIndex={activeSceneIndex ?? 0}
              onSelect={moveToScene}
            />
            
            <SceneCard
              scene={scenes[activeSceneIndex ?? 0]}
              onUpdateText={updateSceneText}
              onGenerateImagePrompt={generateImagePrompt}
              onGenerateImages={generateImages}
              onSelectImage={selectImage}
              onGenerateVideoPrompt={generateVideoPrompt}
              onGenerateVideo={generateVideo}
            />
            
            <div className="flex justify-between mt-6">
              <button
                onClick={() => (activeSceneIndex ?? 0) > 0 && moveToScene((activeSceneIndex ?? 0) - 1)}
                disabled={(activeSceneIndex ?? 0) === 0}
                className={`px-4 py-2 rounded-md ${
                  (activeSceneIndex ?? 0) === 0 
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                이전 씬
              </button>
              <button
                onClick={downloadJSON}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                JSON 내보내기
              </button>
              <button
                onClick={() => (activeSceneIndex ?? 0) < scenes.length - 1 && moveToScene((activeSceneIndex ?? 0) + 1)}
                disabled={(activeSceneIndex ?? 0) === scenes.length - 1}
                className={`px-4 py-2 rounded-md ${
                  (activeSceneIndex ?? 0) === scenes.length - 1 
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                다음 씬
              </button>
            </div>
          </div>
        )}
      </main>
      
      <InsufficientCreditsModal 
        isOpen={showInsufficientCreditsModal}
        onClose={() => setShowInsufficientCreditsModal(false)}
        requiredCredits={requiredCredits}
        operation={currentOperation}
      />
    </div>
  )
}

export default SynopsisView