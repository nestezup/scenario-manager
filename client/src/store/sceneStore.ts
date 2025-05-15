import { create } from 'zustand'
import { Scene, ParseScenesResponse } from '../types'
import { generateImagePrompt, generateImages, describeImage } from '../api'

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
    return get().scenes.some(scene => scene.videoPrompt)
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
  
  downloadJSON: () => {
    const { scenes, isAnySceneCompleted } = get()
    
    if (!isAnySceneCompleted) {
      return
    }
    
    const output = scenes
      .filter(scene => scene.videoPrompt)
      .map(scene => ({
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
}))