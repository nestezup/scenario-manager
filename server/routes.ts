import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from 'node-fetch';
import { 
  parseSceneRequestSchema, 
  imagePromptRequestSchema, 
  generateImageRequestSchema,
  describeImageRequestSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes for our POC application
  
  // Parse scenes from synopsis
  app.post('/api/parse-scenes', async (req, res) => {
    try {
      const data = parseSceneRequestSchema.parse(req.body);
      
      // 실제 Dify API를 사용하여 씬을 분할합니다
      const response = await fetch('https://dify.slowcampus.kr/v1/workflows/run', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer app-twgpaqfPDJR2XU3qnjy6Q9LM',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: {
            synopsis: data.synopsis,
            scene_count: data.scene_count
          },
          // 스트리밍 대신 blocking 모드 사용
          response_mode: "blocking",
          user: "user-" + Math.random().toString(36).substring(2, 10)
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dify API error: ${errorText}`);
      }
      
      const difyData = await response.json() as { 
        data?: { 
          outputs?: { 
            text?: string 
          } 
        } 
      };
      
      // Dify API 응답 구조 확인
      if (!difyData.data?.outputs?.text) {
        throw new Error('Dify API 응답에 필요한 데이터가 없습니다: ' + JSON.stringify(difyData));
      }
      
      // Dify API 응답의 text 필드에서 JSON 문자열 파싱
      const scenes = JSON.parse(difyData.data.outputs.text);
      
      res.json(scenes);
    } catch (error: any) {
      console.error("Scene parsing error:", error);
      res.status(500).json({ message: "Failed to parse scenes: " + (error.message || 'Unknown error') });
    }
  });

  // Generate image prompt from scene text
  app.post('/api/generate-image-prompt', async (req, res) => {
    try {
      const data = imagePromptRequestSchema.parse(req.body);
      
      // Mock image prompt generation
      const styleDescriptors = [
        "cinematic lighting, detailed, high definition, 8K",
        "dramatic composition, movie still, professional photography",
        "high detail, realistic texture, professional cinematography",
        "photorealistic, high quality, detailed environment",
        "film grain, atmospheric lighting, depth of field"
      ];
      
      const randomStyle = styleDescriptors[Math.floor(Math.random() * styleDescriptors.length)];
      const prompt = `${data.scene_text} ${randomStyle}`;
      
      res.json({ prompt });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Generate images from prompt
  app.post('/api/generate-images', async (req, res) => {
    try {
      const data = generateImageRequestSchema.parse(req.body);
      
      // Mock image generation with film-related stock images
      const movieImages = [
        "https://images.unsplash.com/photo-1516214104703-d870798883c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Forest
        "https://images.unsplash.com/photo-1620332372374-f108c53d2e03?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // City night
        "https://images.unsplash.com/photo-1590523278191-995cbcda646b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Beach
        "https://images.unsplash.com/photo-1483653364400-eedcfb9f1f88?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Dark alley
        "https://images.unsplash.com/photo-1482192505345-5655af888cc4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600", // Lake
        "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"  // Building
      ];
      
      // Choose 3 random images
      const randomIndices: number[] = [];
      while (randomIndices.length < 3) {
        const randomIndex = Math.floor(Math.random() * movieImages.length);
        if (!randomIndices.includes(randomIndex)) {
          randomIndices.push(randomIndex);
        }
      }
      
      const images = randomIndices.map(index => movieImages[index]);
      
      res.json({ images });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Describe image and generate video prompt
  app.post('/api/describe-image', async (req, res) => {
    try {
      const data = describeImageRequestSchema.parse(req.body);
      
      // Mock video prompt generation
      const videoPrompts = [
        "A cinematic sequence showing the scene with dramatic lighting and atmosphere. Camera slowly moves from left to right, revealing the scene details. Depth of field effect with background slightly blurred.",
        "High-definition video capture of the scene. Camera starts with a wide establishing shot and gradually zooms in on the main subject. Natural lighting with golden hour warm tones.",
        "Atmospheric video sequence depicting the environment. Camera makes a slow vertical pan from bottom to top. Moody color grading with high contrast and subtle film grain.",
        "Dynamic video footage with movement. Camera follows the action with smooth tracking shot. Professional cinema-quality lighting with emphasis on shadows and highlights."
      ];
      
      const negativePrompts = [
        "low quality, blurry, distorted, pixelated, low resolution, oversaturated, amateur footage, shaky camera, out of focus, poor lighting",
        "text overlay, watermarks, logos, timestamps, jerky movement, digital artifacts, noise, grain, dust, scratches, stains",
        "glitchy, over-sharpened, noisy, poorly edited, bad composition, distracting elements, incorrect colors",
        "low contrast, washed out colors, poor color grading, unstable footage, excessive zoom, poor white balance, incorrect aspect ratio"
      ];
      
      const randomIndex = Math.floor(Math.random() * videoPrompts.length);
      
      res.json({
        video_prompt: videoPrompts[randomIndex],
        negative_prompt: negativePrompts[randomIndex]
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
