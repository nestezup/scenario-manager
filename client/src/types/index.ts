// Define types for the application

export interface Scene {
  id: number
  text: string
  order: number
  imagePrompt?: string
  images?: string[]
  selectedImageIndex?: number | null
  selectedImage?: string | null
  videoPrompt?: string
  negativePrompt?: string
  loadingImagePrompt?: boolean
  loadingImages?: boolean
  loadingVideoPrompt?: boolean
}

export interface NotificationType {
  show: boolean
  message: string
  type: 'success' | 'error' | 'info'
}

export interface SceneOutput {
  scene_id: number
  scene_text: string
  image_prompt: string
  selected_image: string
  video_prompt: string
  negative_prompt: string
}

// API response types
export interface ParseScenesResponse {
  id: number
  text: string
  order: number
}

export interface GenerateImagePromptResponse {
  prompt: string
}

export interface GenerateImageResponse {
  images: string[]
}

export interface DescribeImageResponse {
  video_prompt: string
  negative_prompt: string
}