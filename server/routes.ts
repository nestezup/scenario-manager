import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from 'node-fetch';
import Replicate from 'replicate';
import { 
  parseSceneRequestSchema, 
  imagePromptRequestSchema, 
  generateImageRequestSchema,
  describeImageRequestSchema
} from "@shared/schema";

// Replicate 클라이언트 초기화
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

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
      
      // 실제 Dify API 호출
      const response = await fetch('https://dify.slowcampus.kr/v1/workflows/run', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer app-3iMrcMZH02bGoXNqKLVpCdDF',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: {
            scene_text: data.scene_text
          },
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
      const imagePromptData = JSON.parse(difyData.data.outputs.text);
      
      res.json(imagePromptData);
    } catch (error: any) {
      console.error("Image prompt generation error:", error);
      res.status(500).json({ message: "Failed to generate image prompt: " + (error.message || 'Unknown error') });
    }
  });

  // Generate images from prompt
  app.post('/api/generate-images', async (req, res) => {
    try {
      const data = generateImageRequestSchema.parse(req.body);
      
      if (!process.env.REPLICATE_API_TOKEN) {
        throw new Error('REPLICATE_API_TOKEN is required');
      }
      
      console.log("이미지 생성 요청 프롬프트:", data.prompt);
      
      try {
        // Replicate API를 직접 호출 (Node.js 클라이언트 대신 fetch 사용)
        const prediction = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            version: "black-forest-labs/flux-schnell",
            input: {
              prompt: data.prompt,
              go_fast: true,
              num_outputs: 3,  // 3개의 이미지 생성
              aspect_ratio: "16:9",  // 영화에 적합한 가로세로 비율
              output_format: "webp",
              output_quality: 80
            }
          })
        });
        
        const predictionData = await prediction.json();
        console.log("Replicate 초기 응답:", JSON.stringify(predictionData).slice(0, 200) + "...");
        
        // 결과가 완료될 때까지 폴링
        let imageUrls: string[] = [];
        let attempts = 0;
        const maxAttempts = 15; // 최대 시도 횟수 (약 30초)
        
        while (attempts < maxAttempts) {
          attempts++;
          
          // 진행 상태 확인
          const checkResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionData.id}`, {
            headers: {
              "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`
            }
          });
          
          const checkData = await checkResponse.json();
          console.log(`폴링 시도 #${attempts} - 상태: ${checkData.status}`);
          
          if (checkData.status === "succeeded") {
            imageUrls = checkData.output || [];
            break;
          } else if (checkData.status === "failed" || checkData.error) {
            throw new Error(`Replicate API 실패: ${checkData.error || "Unknown error"}`);
          }
          
          // 2초 대기
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        if (imageUrls.length === 0) {
          if (attempts >= maxAttempts) {
            throw new Error("시간 초과: 이미지 생성이 너무 오래 걸립니다");
          } else {
            throw new Error("이미지 URL을 받지 못했습니다");
          }
        }
        
        console.log("생성된 이미지 URL:", imageUrls);
        res.json({ images: imageUrls });
      } catch (replicateError: any) {
        console.error("Replicate API 오류:", replicateError);
        
        // API 오류 시 임시로 가상 이미지 제공 (테스트용)
        const fallbackImages = [
          "https://images.unsplash.com/photo-1516214104703-d870798883c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1620332372374-f108c53d2e03?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1590523278191-995cbcda646b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        ];
        
        res.json({ images: fallbackImages });
      }
    } catch (error: any) {
      console.error("이미지 생성 오류:", error);
      res.status(500).json({ message: "Failed to generate images: " + (error.message || 'Unknown error') });
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
