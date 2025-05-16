import { create } from 'zustand'
import { Scene, ParseScenesResponse, SceneWithVideo } from '../types'
import { generateImagePrompt, generateImages, describeImage, generateVideo, checkVideoStatus } from '../api'

interface SceneState {
  step: 'input' | 'processing' | 'scenes'
  synopsis: string
  sceneCount: number
  scenes: Scene[]
  activeSceneIndex: number | null
  
  // Getters
  getProgressPercentage: number
  isAnySceneCompleted: boolean
  activeScene: Scene | null
  
  // Actions
  setStep: (step: 'input' | 'processing' | 'scenes') => void
  setSynopsis: (synopsis: string) => void
  setSceneCount: (count: number) => void
  setScenes: (scenes: Scene[]) => void
  setActiveSceneIndex: (index: number | null) => void
  updateSceneText: (index: number, text: string) => void
  generateImagePromptForScene: () => Promise<void>
  generateImagesForScene: () => Promise<void>
  selectImage: (index: number) => void
  generateVideoPromptForScene: () => Promise<void>
  generateVideoForScene: () => Promise<void>
  checkVideoStatus: () => Promise<void>
  moveScene: (direction: number) => void
  addScene: () => void
  deleteScene: (index: number) => void
  downloadJSON: () => void
}

export const useSceneStore = create<SceneState>((set, get) => ({
  step: 'input',
  synopsis: '',
  sceneCount: 10,
  scenes: [],
  activeSceneIndex: null,
  
  // Computed values
  get getProgressPercentage() {
    const scenes = get().scenes
    
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
  },
  
  get isAnySceneCompleted() {
    return get().scenes.some(scene => scene.videoPrompt && (scene as SceneWithVideo).videoUrl)
  },
  
  get activeScene() {
    const { scenes, activeSceneIndex } = get()
    if (activeSceneIndex !== null && scenes[activeSceneIndex]) {
      return scenes[activeSceneIndex]
    }
    return null
  },
  
  // Actions
  setStep: (step) => set({ step }),
  
  setSynopsis: (synopsis) => set({ synopsis }),
  
  setSceneCount: (sceneCount) => set({ sceneCount }),
  
  setScenes: (scenes) => set({ scenes }),
  
  setActiveSceneIndex: (index) => set({ activeSceneIndex: index }),
  
  updateSceneText: (index, text) => set(state => ({
    scenes: state.scenes.map((scene, i) => 
      i === index ? { ...scene, text } : scene
    )
  })),
  
  generateImagePromptForScene: async () => {
    const { activeSceneIndex, scenes, activeScene } = get()
    
    if (!activeScene || !activeScene.text.trim() || activeSceneIndex === null) {
      return
    }
    
    // Update loading state
    set(state => ({
      scenes: state.scenes.map((scene, i) => 
        i === activeSceneIndex ? { ...scene, loadingImagePrompt: true } : scene
      )
    }))
    
    try {
      const response = await generateImagePrompt({
        scene_text: activeScene.text
      })
      
      // Update scene with generated prompt
      set(state => ({
        scenes: state.scenes.map((scene, i) => 
          i === activeSceneIndex 
            ? { ...scene, imagePrompt: response.prompt, loadingImagePrompt: false } 
            : scene
        )
      }))
      
    } catch (error) {
      console.error('Error generating image prompt:', error)
      
      // Reset loading state
      set(state => ({
        scenes: state.scenes.map((scene, i) => 
          i === activeSceneIndex ? { ...scene, loadingImagePrompt: false } : scene
        )
      }))
    }
  },
  
  generateImagesForScene: async () => {
    const { activeSceneIndex, activeScene } = get()
    
    if (!activeScene || !activeScene.imagePrompt || activeSceneIndex === null) {
      return
    }
    
    // Update loading state
    set(state => ({
      scenes: state.scenes.map((scene, i) => 
        i === activeSceneIndex ? { ...scene, loadingImages: true } : scene
      )
    }))
    
    try {
      const response = await generateImages({
        prompt: activeScene.imagePrompt
      })
      
      // Update scene with generated images
      set(state => ({
        scenes: state.scenes.map((scene, i) => 
          i === activeSceneIndex 
            ? { ...scene, images: response.images, loadingImages: false } 
            : scene
        )
      }))
      
    } catch (error) {
      console.error('Error generating images:', error)
      
      // Reset loading state
      set(state => ({
        scenes: state.scenes.map((scene, i) => 
          i === activeSceneIndex ? { ...scene, loadingImages: false } : scene
        )
      }))
    }
  },
  
  selectImage: (index) => {
    const { activeSceneIndex, activeScene } = get()
    
    if (activeSceneIndex === null || !activeScene || !activeScene.images) {
      return
    }
    
    const selectedImage = activeScene.images[index]
    
    set(state => ({
      scenes: state.scenes.map((scene, i) => 
        i === activeSceneIndex 
          ? { ...scene, selectedImageIndex: index, selectedImage } 
          : scene
      )
    }))
  },
  
  generateVideoPromptForScene: async () => {
    const { activeSceneIndex, activeScene } = get()
    
    if (!activeScene || !activeScene.selectedImage || activeSceneIndex === null) {
      return
    }
    
    // Update loading state
    set(state => ({
      scenes: state.scenes.map((scene, i) => 
        i === activeSceneIndex ? { ...scene, loadingVideoPrompt: true } : scene
      )
    }))
    
    try {
      const response = await describeImage({
        image_url: activeScene.selectedImage
      })
      
      // Update scene with video prompt and negative prompt
      set(state => ({
        scenes: state.scenes.map((scene, i) => 
          i === activeSceneIndex 
            ? { 
                ...scene, 
                videoPrompt: response.video_prompt, 
                negativePrompt: response.negative_prompt,
                loadingVideoPrompt: false 
              } 
            : scene
        )
      }))
      
    } catch (error) {
      console.error('Error generating video prompt:', error)
      
      // Reset loading state
      set(state => ({
        scenes: state.scenes.map((scene, i) => 
          i === activeSceneIndex ? { ...scene, loadingVideoPrompt: false } : scene
        )
      }))
    }
  },
  
  moveScene: (direction) => {
    const { activeSceneIndex, scenes } = get()
    
    if (activeSceneIndex === null) return
    
    const newIndex = activeSceneIndex + direction
    if (newIndex >= 0 && newIndex < scenes.length) {
      set({ activeSceneIndex: newIndex })
    }
  },
  
  addScene: () => {
    const { scenes } = get()
    
    const newId = scenes.length > 0 
      ? Math.max(...scenes.map(s => s.id)) + 1 
      : 1
      
    const newScene: Scene = {
      id: newId,
      text: '새로운 씬 내용을 입력하세요.',
      order: scenes.length + 1,
      imagePrompt: '',
      images: [],
      selectedImageIndex: null,
      selectedImage: null,
      videoPrompt: '',
      negativePrompt: '',
      loadingImagePrompt: false,
      loadingImages: false,
      loadingVideoPrompt: false
    }
    
    set(state => ({
      scenes: [...state.scenes, newScene],
      activeSceneIndex: state.scenes.length
    }))
  },
  
  deleteScene: (index) => {
    const { scenes, activeSceneIndex } = get()
    
    if (scenes.length <= 1) {
      return // Don't delete the last scene
    }
    
    const newScenes = [...scenes]
    newScenes.splice(index, 1)
    
    let newActiveIndex = activeSceneIndex
    if (activeSceneIndex !== null) {
      if (index === activeSceneIndex) {
        newActiveIndex = Math.min(activeSceneIndex, newScenes.length - 1)
      } else if (index < activeSceneIndex) {
        newActiveIndex = activeSceneIndex - 1
      }
    }
    
    set({
      scenes: newScenes,
      activeSceneIndex: newActiveIndex
    })
  },
  
  generateVideoForScene: async () => {
    const { activeSceneIndex, activeScene } = get()
    
    if (!activeScene || !activeScene.videoPrompt || !activeScene.selectedImage || activeSceneIndex === null) {
      return
    }
    
    // Update loading state
    set(state => ({
      scenes: state.scenes.map((scene, i) => 
        i === activeSceneIndex ? { 
          ...scene, 
          loadingVideo: true,
          videoStatus: undefined,
          videoRequestId: undefined,
          videoUrl: undefined,
          // 영상 생성전에 썸네일을 선택한 이미지로 미리 설정
          thumbnailUrl: scene.selectedImage,
          videoRequestStartTime: Date.now()
        } : scene
      )
    }))
    
    try {
      // 영상 생성 요청 보내기
      const response = await generateVideo({
        image_url: activeScene.selectedImage,
        video_prompt: activeScene.videoPrompt,
        negative_prompt: activeScene.negativePrompt
      })
      
      console.log('Video generation request:', response)
      
      // 요청 ID 저장
      set(state => ({
        scenes: state.scenes.map((scene, i) => 
          i === activeSceneIndex ? { 
            ...scene, 
            loadingVideo: false,
            videoRequestId: response.request_id,
            videoStatus: 'pending'
          } : scene
        )
      }))
      
      // 상태 확인 시작 (요청 후 자동으로 상태 확인)
      setTimeout(() => {
        get().checkVideoStatus()
      }, 2000) // 2초 후 첫 상태 확인
      
    } catch (error) {
      console.error('Error generating video:', error)
      
      // 오류 상태 설정
      set(state => ({
        scenes: state.scenes.map((scene, i) => 
          i === activeSceneIndex ? { 
            ...scene, 
            loadingVideo: false,
            videoStatus: 'failed'
          } : scene
        )
      }))
    }
  },
  
  checkVideoStatus: async () => {
    const { activeSceneIndex, activeScene } = get()
    
    if (!activeSceneIndex || !activeScene) {
      return
    }
    
    // 비디오 요청 상태 확인을 위해 확장된 타입으로 변환
    const sceneWithVideo = activeScene as SceneWithVideo
    
    if (!sceneWithVideo.videoRequestId || sceneWithVideo.videoStatus !== 'pending') {
      return
    }
    
    try {
      // 상태 확인 API 호출
      const response = await checkVideoStatus({
        request_id: sceneWithVideo.videoRequestId
      })
      
      console.log('Video status check:', response)
      
      if (response.status === 'completed' && response.video_url) {
        // 완료 - 영상 및 썸네일 URL 저장
        set(state => ({
          scenes: state.scenes.map((scene, i) => 
            i === activeSceneIndex ? { 
              ...scene, 
              videoStatus: 'completed',
              videoUrl: response.video_url,
              thumbnailUrl: response.thumbnail_url
            } : scene
          )
        }))
      } else if (response.status === 'failed') {
        // 실패
        set(state => ({
          scenes: state.scenes.map((scene, i) => 
            i === activeSceneIndex ? { 
              ...scene, 
              videoStatus: 'failed'
            } : scene
          )
        }))
      } else {
        // 여전히 처리 중 - 15초 후 다시 확인
        setTimeout(() => {
          get().checkVideoStatus()
        }, 15000)
      }
    } catch (error) {
      console.error('Error checking video status:', error)
      
      // 오류시에도 재시도 (최대 3분)
      const totalTime = Date.now() - (sceneWithVideo.videoRequestStartTime || Date.now())
      if (totalTime < 3 * 60 * 1000) { // 3분 이내라면 재시도
        setTimeout(() => {
          get().checkVideoStatus()
        }, 15000)
      } else {
        // 3분 초과시 실패로 처리
        set(state => ({
          scenes: state.scenes.map((scene, i) => 
            i === activeSceneIndex ? { 
              ...scene, 
              videoStatus: 'failed'
            } : scene
          )
        }))
      }
    }
  },
  
  downloadJSON: () => {
    const { scenes, isAnySceneCompleted } = get()
    
    if (!isAnySceneCompleted) {
      return
    }
    
    const output = scenes
      .filter(scene => scene.videoPrompt && (scene as SceneWithVideo).videoUrl)
      .map(scene => ({
        scene_id: scene.id,
        scene_text: scene.text,
        image_prompt: scene.imagePrompt || '',
        selected_image: scene.selectedImage || '',
        video_prompt: scene.videoPrompt || '',
        negative_prompt: scene.negativePrompt || '',
        video_url: (scene as SceneWithVideo).videoUrl || ''
      }))
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(output, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "video_prompts.json")
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  },
  
  // 비디오 다운로드 헬퍼 함수
  downloadVideo: async (videoUrl: string, fileName = 'verticalVideo.mp4') => {
    try {
      // Fetch 요청으로 파일 데이터 가져오기
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error('동영상을 다운로드할 수 없습니다.');
      }
      
      // 응답을 Blob으로 변환
      const blob = await response.blob();
      
      // Blob URL 생성
      const blobUrl = URL.createObjectURL(blob);
      
      // 다운로드 링크 생성 및 클릭
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // 정리
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 100);
      
      return true;
    } catch (error) {
      console.error('다운로드 오류:', error);
      return false;
    }
  }
}))