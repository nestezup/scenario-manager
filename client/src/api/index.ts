import {
  type ParseScenesResponse,
  type GenerateImagePromptResponse,
  type GenerateImageResponse,
  type DescribeImageResponse
} from '../types'

// Base API URL - can be changed based on environment
const BASE_URL = ''

// Helper function to handle API errors
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `API error: ${response.status}`)
  }
  return response.json() as Promise<T>
}

// 1. Parse Scenes API
export async function parseScenes(data: { synopsis: string, scene_count: number }): Promise<ParseScenesResponse[]> {
  const response = await fetch(`${BASE_URL}/api/parse-scenes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  
  return handleResponse<ParseScenesResponse[]>(response)
}

// 2. Generate Image Prompt API
export async function generateImagePrompt(data: { scene_text: string }): Promise<GenerateImagePromptResponse> {
  const response = await fetch(`${BASE_URL}/api/generate-image-prompt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  
  return handleResponse<GenerateImagePromptResponse>(response)
}

// 3. Generate Images API
export async function generateImages(data: { prompt: string }): Promise<GenerateImageResponse> {
  const response = await fetch(`${BASE_URL}/api/generate-images`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  
  return handleResponse<GenerateImageResponse>(response)
}

// 4. Describe Image API
export async function describeImage(data: { image_url: string }): Promise<DescribeImageResponse> {
  const response = await fetch(`${BASE_URL}/api/describe-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  
  return handleResponse<DescribeImageResponse>(response)
}