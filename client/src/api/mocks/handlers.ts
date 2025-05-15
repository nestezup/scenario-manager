import { rest } from 'msw'

// Mock data arrays
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
  "혼잡한 기차역에서 주인공은 중요한 가방을 놓치게 된다.",
  "고대 유적지에서 주인공은 신비한 조각상 앞에 서 있다.",
  "밤하늘의 별을 보며 주인공은 중요한 결정을 내린다.",
  "오래된 도서관에서 주인공은 비밀 책을 찾고 있다.",
  "폭풍이 치는 바다에서 주인공의 배가 흔들리고 있다.",
  "분주한 시장에서 주인공은 수상한 거래를 목격한다.",
  "비밀 연구소에서 주인공은 충격적인 실험을 발견한다.",
  "고층 아파트에서 주인공은 옆 건물의 수상한 활동을 관찰한다.",
  "버려진 놀이공원에서 주인공은 이상한 소리를 듣는다.",
  "지하철 역에서 주인공은 미스터리한 상자를 발견한다.",
  "화려한 파티장에서 주인공은 중요한 정보를 얻기 위해 잠입한다."
]

// Movie images for generating scenes
const movieImages = [
  "https://images.unsplash.com/photo-1516214104703-d870798883c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Forest
  "https://images.unsplash.com/photo-1620332372374-f108c53d2e03?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // City night
  "https://images.unsplash.com/photo-1590523278191-995cbcda646b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Beach
  "https://images.unsplash.com/photo-1483653364400-eedcfb9f1f88?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Dark alley
  "https://images.unsplash.com/photo-1482192505345-5655af888cc4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Lake
  "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Building view
  "https://images.unsplash.com/photo-1504275107627-0c2ba7a43dba?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Warehouse
  "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Rainy street
  "https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Snowy mountain
  "https://images.unsplash.com/photo-1529179307417-ca83d09f1580?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Train station
  "https://images.unsplash.com/photo-1527506071763-6e8e48d1e6c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Ancient ruin
  "https://images.unsplash.com/photo-1465101162946-4377e57745c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Starry night
  "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Library
  "https://images.unsplash.com/photo-1516611144441-b02b1124f58c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"  // Stormy sea
]

// Style descriptors for image prompts
const styleDescriptors = [
  "cinematic lighting, detailed, high definition, 8K",
  "dramatic composition, movie still, professional photography",
  "high detail, realistic texture, professional cinematography",
  "photorealistic, high quality, detailed environment",
  "film grain, atmospheric lighting, depth of field"
]

// Video prompts for generated images
const videoPrompts = [
  "A cinematic sequence showing the scene with dramatic lighting and atmosphere. Camera slowly moves from left to right, revealing the scene details. Depth of field effect with background slightly blurred.",
  "High-definition video capture of the scene. Camera starts with a wide establishing shot and gradually zooms in on the main subject. Natural lighting with golden hour warm tones.",
  "Atmospheric video sequence depicting the environment. Camera makes a slow vertical pan from bottom to top. Moody color grading with high contrast and subtle film grain.",
  "Dynamic video footage with movement. Camera follows the action with smooth tracking shot. Professional cinema-quality lighting with emphasis on shadows and highlights."
]

// Negative prompts for video generation
const negativePrompts = [
  "low quality, blurry, distorted, pixelated, low resolution, oversaturated, amateur footage, shaky camera, out of focus, poor lighting",
  "text overlay, watermarks, logos, timestamps, jerky movement, digital artifacts, noise, grain, dust, scratches, stains",
  "glitchy, over-sharpened, noisy, poorly edited, bad composition, distracting elements, incorrect colors",
  "low contrast, washed out colors, poor color grading, unstable footage, excessive zoom, poor white balance, incorrect aspect ratio"
]

// Define API handlers
export const handlers = [
  // Parse scenes from synopsis
  rest.post('/api/parse-scenes', (req, res, ctx) => {
    const { synopsis, scene_count } = req.body as { synopsis: string, scene_count: number }
    
    const scenes = Array.from({ length: scene_count }, (_, i) => ({
      id: i + 1,
      text: sceneStarters[i % sceneStarters.length],
      order: i + 1
    }))
    
    return res(
      ctx.delay(1500),
      ctx.status(200),
      ctx.json(scenes)
    )
  }),
  
  // Generate image prompt from scene text
  rest.post('/api/generate-image-prompt', (req, res, ctx) => {
    const { scene_text } = req.body as { scene_text: string }
    
    const randomStyle = styleDescriptors[Math.floor(Math.random() * styleDescriptors.length)]
    const prompt = `${scene_text} ${randomStyle}`
    
    return res(
      ctx.delay(1000),
      ctx.status(200),
      ctx.json({ prompt })
    )
  }),
  
  // Generate images from prompt
  rest.post('/api/generate-image', (req, res, ctx) => {
    // Get 3 random images from the array
    const randomIndices: number[] = []
    while (randomIndices.length < 3) {
      const randomIndex = Math.floor(Math.random() * movieImages.length)
      if (!randomIndices.includes(randomIndex)) {
        randomIndices.push(randomIndex)
      }
    }
    
    const images = randomIndices.map(index => movieImages[index])
    
    return res(
      ctx.delay(1500),
      ctx.status(200),
      ctx.json({ images })
    )
  }),
  
  // Describe image and generate video prompt
  rest.post('/api/describe-image', (req, res, ctx) => {
    const randomIndex = Math.floor(Math.random() * videoPrompts.length)
    
    return res(
      ctx.delay(1200),
      ctx.status(200),
      ctx.json({
        video_prompt: videoPrompts[randomIndex],
        negative_prompt: negativePrompts[randomIndex]
      })
    )
  })
]