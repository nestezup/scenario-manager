import { rest } from 'msw'
import {
  type ParseScenesResponse,
  type GenerateImagePromptResponse,
  type GenerateImageResponse,
  type DescribeImageResponse
} from '../../types'

// Mock scene data
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

// Mock image data
const movieImages = [
  "https://images.unsplash.com/photo-1516214104703-d870798883c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Forest
  "https://images.unsplash.com/photo-1620332372374-f108c53d2e03?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // City night
  "https://images.unsplash.com/photo-1590523278191-995cbcda646b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Beach
  "https://images.unsplash.com/photo-1483653364400-eedcfb9f1f88?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" // Dark alley
]

// Mock prompt data
const styleDescriptors = [
  "cinematic lighting, detailed, high definition, 8K",
  "dramatic composition, movie still, professional photography"
]

// Mock video prompts
const videoPrompts = [
  "A cinematic sequence showing the scene with dramatic lighting and atmosphere. Camera slowly moves from left to right, revealing the scene details. Depth of field effect with background slightly blurred.",
  "High-definition video capture of the scene. Camera starts with a wide establishing shot and gradually zooms in on the main subject. Natural lighting with golden hour warm tones."
]

// Mock negative prompts
const negativePrompts = [
  "low quality, blurry, distorted, pixelated, low resolution, oversaturated, amateur footage, shaky camera, out of focus, poor lighting",
  "text overlay, watermarks, logos, timestamps, jerky movement, digital artifacts, noise, grain, dust, scratches, stains"
]

// Define handlers for each API endpoint
export const handlers = [
  // 1. Parse Scenes API
  rest.post('/api/parse-scenes', async (req, res, ctx) => {
    const { synopsis, scene_count } = await req.json()
    
    // Validate input
    if (!synopsis || !scene_count) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Synopsis and scene count are required' })
      )
    }
    
    // Create mock scenes
    const scenes: ParseScenesResponse[] = Array.from({ length: scene_count }, (_, i) => ({
      id: i + 1,
      text: sceneStarters[i % sceneStarters.length],
      order: i + 1
    }))
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    return res(ctx.json(scenes))
  }),
  
  // 2. Generate Image Prompt API
  rest.post('/api/generate-image-prompt', async (req, res, ctx) => {
    const { scene_text } = await req.json()
    
    // Validate input
    if (!scene_text) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Scene text is required' })
      )
    }
    
    // Generate mock image prompt
    const randomStyle = styleDescriptors[Math.floor(Math.random() * styleDescriptors.length)]
    const prompt = `${scene_text} ${randomStyle}`
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return res(ctx.json({ prompt } as GenerateImagePromptResponse))
  }),
  
  // 3. Generate Images API
  rest.post('/api/generate-images', async (req, res, ctx) => {
    const { prompt } = await req.json()
    
    // Validate input
    if (!prompt) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Prompt is required' })
      )
    }
    
    // Get 3 random images
    const randomIndices: number[] = []
    while (randomIndices.length < 3) {
      const randomIndex = Math.floor(Math.random() * movieImages.length)
      if (!randomIndices.includes(randomIndex)) {
        randomIndices.push(randomIndex)
      }
    }
    
    const images = randomIndices.map(index => movieImages[index])
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    return res(ctx.json({ images } as GenerateImageResponse))
  }),
  
  // 4. Describe Image API
  rest.post('/api/describe-image', async (req, res, ctx) => {
    const { image_url } = await req.json()
    
    // Validate input
    if (!image_url) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Image URL is required' })
      )
    }
    
    // Generate mock video prompt and negative prompt
    const randomIndex = Math.floor(Math.random() * videoPrompts.length)
    const response = {
      video_prompt: videoPrompts[randomIndex],
      negative_prompt: negativePrompts[randomIndex]
    } as DescribeImageResponse
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    return res(ctx.json(response))
  })
]