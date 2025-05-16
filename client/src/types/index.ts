// Scene related types
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

// Notification types
export interface NotificationType {
  show: boolean
  message: string
  type: 'success' | 'error' | 'info'
}

// JSON output format
export interface SceneOutput {
  scene_id: number
  scene_text: string
  image_prompt: string
  selected_image: string
  video_prompt: string
  negative_prompt: string
}

// API Response Types
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

export interface GenerateVideoResponse {
  request_id: string
  status: string
}

export interface CheckVideoStatusResponse {
  status: 'pending' | 'completed' | 'failed'
  video_url?: string
  thumbnail_url?: string
  progress?: string
  error?: string
}

// 씬 타입 확장
export interface SceneWithVideo extends Scene {
  videoRequestId?: string
  videoStatus?: 'pending' | 'completed' | 'failed'
  videoUrl?: string
  thumbnailUrl?: string
  loadingVideo?: boolean
  videoRequestStartTime?: number
}