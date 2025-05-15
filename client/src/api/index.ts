import { 
  ParseScenesResponse, 
  GenerateImagePromptResponse, 
  GenerateImageResponse, 
  DescribeImageResponse 
} from '../types'

// Parse scenes from synopsis
export async function parseScenes(data: { synopsis: string, scene_count: number }): Promise<ParseScenesResponse[]> {
  const response = await fetch('/api/parse-scenes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    throw new Error('Failed to parse scenes')
  }
  
  return response.json()
}

// Generate image prompt from scene text
export async function generateImagePrompt(data: { scene_text: string }): Promise<GenerateImagePromptResponse> {
  const response = await fetch('/api/generate-image-prompt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    throw new Error('Failed to generate image prompt')
  }
  
  return response.json()
}

// Generate images from prompt
export async function generateImages(data: { prompt: string }): Promise<GenerateImageResponse> {
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    throw new Error('Failed to generate images')
  }
  
  return response.json()
}

// Describe image and generate video prompt
export async function describeImage(data: { image_url: string }): Promise<DescribeImageResponse> {
  const response = await fetch('/api/describe-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    throw new Error('Failed to describe image')
  }
  
  return response.json()
}