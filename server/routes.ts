import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";
import Replicate from "replicate";
import { fal } from "@fal-ai/client";
import WebSocket from "ws";
import {
  parseSceneRequestSchema,
  imagePromptRequestSchema,
  generateImageRequestSchema,
  describeImageRequestSchema,
  generateVideoRequestSchema,
  checkVideoStatusRequestSchema
} from "@shared/schema";
import { AuthService } from "./services/auth.service";
import { CreditsService } from "./services/credits.service";
import { supabase } from "./supabase";
import { z } from "zod";

// Initialize services
const authService = new AuthService();
const creditsService = new CreditsService();

// Replicate 클라이언트 초기화
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

// fal.ai 클라이언트 설정
if (process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY
  });
}

// 비디오 요청 정보를 임시 저장할 캐시 (메모리)
const videoRequestCache = new Map();

// Define validation schemas for auth routes
const signupSchema = z.object({
  email: z.string().email(),
});

const magicLinkSchema = z.object({
  email: z.string().email(),
});

// Credit costs for different operations
const CREDIT_COSTS = {
  IMAGE_GENERATION: 5,
  PROMPT_GENERATION: 5,
  VIDEO_GENERATION: 10,
  SCENE_PARSING: 5
};

// Rate limiting for magic link requests
const magicLinkRateLimit = new Map<string, number>();
const RATE_LIMIT_DURATION = 60000; // 60 seconds

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication Routes
  
  // Magic link login
  app.post("/api/magic-link", async (req, res) => {
    try {
      console.log("POST /api/magic-link - Request body:", req.body);
      
      const { email } = magicLinkSchema.parse(req.body);
      console.log("Parsed email:", email);
      
      // Rate limiting check
      const now = Date.now();
      const lastRequest = magicLinkRateLimit.get(email);
      
      if (lastRequest && (now - lastRequest) < RATE_LIMIT_DURATION) {
        const remainingTime = Math.ceil((RATE_LIMIT_DURATION - (now - lastRequest)) / 1000);
        console.log(`Rate limit hit for ${email}, ${remainingTime}s remaining`);
        return res.status(429).json({ 
          success: false, 
          message: `A magic link was recently sent to this email. Please wait ${remainingTime} seconds before requesting another.` 
        });
      }
      
      // Record this request
      magicLinkRateLimit.set(email, now);
      
      // Clean up old entries (older than rate limit duration)
      for (const [storedEmail, timestamp] of Array.from(magicLinkRateLimit.entries())) {
        if (now - timestamp > RATE_LIMIT_DURATION) {
          magicLinkRateLimit.delete(storedEmail);
        }
      }
      
      const result = await authService.sendMagicLink(email);
      console.log("Magic link result:", result.success ? "Success" : "Failed");
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: "Magic link sent to your email. Please check your inbox." 
        });
      } else {
        // Remove from rate limit if sending failed
        magicLinkRateLimit.delete(email);
        res.status(400).json({ 
          success: false, 
          message: "Failed to send magic link. Please try again." 
        });
      }
    } catch (error: any) {
      console.error("Magic link error:", error);
      res.status(400).json({ 
        success: false, 
        message: error.message || "Invalid request data" 
      });
    }
  });
  
  // Get current user
  app.get("/api/me", async (req: Request & { user?: any }, res) => {
    console.log("=== /api/me ENDPOINT REACHED ===");
    console.log("GET /api/me - 세션 ID:", req.session.id);
    console.log("GET /api/me - 세션 사용자 ID:", req.session.userId);
    console.log("GET /api/me - Request headers:", req.headers);
    
    // Authorization 헤더에서 토큰 확인
    const authHeader = req.headers.authorization;
    let userId = req.user?.id || req.session.userId;
    let bearerToken = null;
    
    // Bearer 토큰이 있으면 사용
    if (authHeader && authHeader.startsWith('Bearer ')) {
      bearerToken = authHeader.substring(7);
      console.log("Authorization 헤더에서 토큰 추출:", bearerToken ? bearerToken.substring(0, 20) + "..." : "없음");
      
      // 토큰에서 사용자 ID 추출 (JWT 디코딩)
      try {
        // JWT 디코딩 로직
        const tokenParts = bearerToken.split('.');
        if (tokenParts.length === 3) {
          const base64Payload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
          const paddedBase64Payload = base64Payload.padEnd(base64Payload.length + (4 - (base64Payload.length % 4)) % 4, '=');
          
          try {
            const payloadBuffer = Buffer.from(paddedBase64Payload, 'base64');
            const payloadStr = payloadBuffer.toString();
            const payload = JSON.parse(payloadStr);
            
            // Supabase는 sub 또는 user_id에 사용자 ID를 저장
            const tokenUserId = payload.sub || payload.user_id || payload.id;
            if (tokenUserId) {
              console.log("토큰에서 추출한 사용자 ID:", tokenUserId);
              userId = tokenUserId;
            }
          } catch (err) {
            console.error("토큰 페이로드 파싱 오류:", err);
          }
        }
      } catch (err) {
        console.error("토큰 디코딩 오류:", err);
      }
    }

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    let email = req.user?.email || '';
    let credits = 0;
    
    // 사용자 정보를 DB에서 조회
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching user from DB in /api/me:', error);
        return res.status(401).json({ message: "User not found in database" });
      }
      
      if (userData) {
        // req.user 설정 (미들웨어가 처리하지 못한 경우를 위해)
        req.user = userData;
        userId = userData.id;
        email = userData.email;
      } else {
        return res.status(401).json({ message: "User not found" });
      }
    } catch (dbError) {
      console.error('Database error in /api/me:', dbError);
      return res.status(500).json({ message: "Server error fetching user data" });
    }
    
    // Get user's credit balance
    credits = await creditsService.getUserCredits(userId) || 0;
    
    res.json({
      id: userId,
      email: email,
      credits: credits
    });
  });
  
  // Logout
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to logout" });
      }
      res.json({ success: true, message: "Logged out successfully" });
    });
  });

  // API Routes for our POC application

  // Parse scenes from synopsis
  app.post("/api/parse-scenes", async (req: Request & { user?: any }, res) => {
    try {
      console.log("=== PARSE SCENES REQUEST DEBUG ===");
      console.log("Raw request body:", req.body);
      console.log("Request body type:", typeof req.body);
      console.log("Scene count value:", req.body.scene_count);
      console.log("Scene count type:", typeof req.body.scene_count);
      console.log("================================");
      
      const { synopsis, scene_count } = parseSceneRequestSchema.parse(req.body);
      
      // Check if user is authenticated and has enough credits
      if (req.user) {
        const currentCredits = await creditsService.getUserCredits(req.user.id);
        const requiredCredits = CREDIT_COSTS.SCENE_PARSING;
        
        console.log(`크레딧 확인: 사용자=${req.user.id}, 현재 크레딧=${currentCredits}, 필요 크레딧=${requiredCredits}`);
        
        const hasCredits = await creditsService.hasEnoughCredits(
          req.user.id, 
          requiredCredits
        );
        
        if (!hasCredits) {
          return res.status(402).json({ 
            success: false,
            message: `크레딧이 부족합니다. 씬 파싱을 위해서는 ${requiredCredits}개의 크레딧이 필요하지만, 현재 ${currentCredits}개의 크레딧만 보유하고 있습니다.`,
            requiredCredits: requiredCredits,
            currentCredits: currentCredits || 0
          });
        }
      }

      // 실제 Dify API를 사용하여 씬을 분할합니다
      const response = await fetch(
        "https://dify.slowcampus.kr/v1/workflows/run",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer app-twgpaqfPDJR2XU3qnjy6Q9LM",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: {
              synopsis: synopsis,
              scene_count: scene_count,
            },
            // 스트리밍 대신 blocking 모드 사용
            response_mode: "blocking",
            user: "user-" + Math.random().toString(36).substring(2, 10),
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dify API error: ${errorText}`);
      }

      const difyData = (await response.json()) as {
        data?: {
          outputs?: {
            text?: string;
          };
        };
      };

      // Dify API 응답 구조 확인
      if (!difyData.data?.outputs?.text) {
        throw new Error(
          "Dify API 응답에 필요한 데이터가 없습니다: " +
            JSON.stringify(difyData),
        );
      }

      // Dify API 응답의 text 필드에서 JSON 문자열 파싱
      const scenes = JSON.parse(difyData.data.outputs.text);
      
      console.log('Parsed scenes from Dify:', scenes);
      console.log('Number of scenes:', scenes.length);
      
      // Deduct credits after successful operation
      if (req.user) {
        console.log('Attempting to deduct credits for scene parsing...');
        const newBalance = await creditsService.deductCredits(
          req.user.id,
          CREDIT_COSTS.SCENE_PARSING,
          "Scene parsing from synopsis"
        );
        console.log('Credit deduction result:', newBalance);
      }

      console.log('Sending scenes response to client:', scenes.length, 'scenes');
      res.json(scenes);
    } catch (error: any) {
      console.error("Scene parsing error:", error);
      res
        .status(500)
        .json({
          message:
            "Failed to parse scenes: " + (error.message || "Unknown error"),
        });
    }
  });

  // Generate image prompt from scene text
  app.post("/api/generate-image-prompt", async (req: Request & { user?: any }, res) => {
    try {
      const data = imagePromptRequestSchema.parse(req.body);
      
      // Check if user is authenticated and has enough credits
      if (req.user) {
        const currentCredits = await creditsService.getUserCredits(req.user.id);
        const requiredCredits = CREDIT_COSTS.PROMPT_GENERATION;
        
        console.log(`크레딧 확인: 사용자=${req.user.id}, 현재 크레딧=${currentCredits}, 필요 크레딧=${requiredCredits}`);
        
        const hasCredits = await creditsService.hasEnoughCredits(
          req.user.id, 
          requiredCredits
        );
        
        if (!hasCredits) {
          return res.status(402).json({ 
            success: false,
            message: `크레딧이 부족합니다. 이미지 프롬프트 생성을 위해서는 ${requiredCredits}개의 크레딧이 필요하지만, 현재 ${currentCredits}개의 크레딧만 보유하고 있습니다.`,
            requiredCredits: requiredCredits,
            currentCredits: currentCredits || 0
          });
        }
      }

      // 실제 Dify API 호출
      const response = await fetch(
        "https://dify.slowcampus.kr/v1/workflows/run",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer app-3iMrcMZH02bGoXNqKLVpCdDF",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: {
              scene_text: data.scene_text,
            },
            response_mode: "blocking",
            user: "user-" + Math.random().toString(36).substring(2, 10),
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dify API error: ${errorText}`);
      }

      const difyData = (await response.json()) as {
        data?: {
          outputs?: {
            text?: string;
          };
        };
      };

      // Dify API 응답 구조 확인
      if (!difyData.data?.outputs?.text) {
        throw new Error(
          "Dify API 응답에 필요한 데이터가 없습니다: " +
            JSON.stringify(difyData),
        );
      }

      // Dify API 응답의 text 필드에서 JSON 문자열 파싱
      const imagePromptData = JSON.parse(difyData.data.outputs.text);
      
      // 프롬프트에서 --ar 16:9 제거 (API에서 이미 aspect_ratio: "9:16"로 설정됨)
      if (imagePromptData.prompt) {
        imagePromptData.prompt = imagePromptData.prompt.replace(/--ar 16:9/g, "");
        console.log("수정된 이미지 프롬프트:", imagePromptData.prompt);
      }
      
      // Deduct credits after successful operation
      if (req.user) {
        await creditsService.deductCredits(
          req.user.id,
          CREDIT_COSTS.PROMPT_GENERATION,
          "Image prompt generation"
        );
      }

      res.json(imagePromptData);
    } catch (error: any) {
      console.error("Image prompt generation error:", error);
      res
        .status(500)
        .json({
          message:
            "Failed to generate image prompt: " +
            (error.message || "Unknown error"),
        });
    }
  });

  // Generate images from prompt
  app.post("/api/generate-images", async (req: Request & { user?: any }, res) => {
    try {
      const data = generateImageRequestSchema.parse(req.body);
      
      const numImages = 3; // 생성할 이미지 개수
      const creditsPerImage = CREDIT_COSTS.IMAGE_GENERATION; // 이미지당 5크레딧
      const totalRequiredCredits = creditsPerImage * numImages; // 총 15크레딧 필요
      
      // Check if user is authenticated and has enough credits
      if (req.user) {
        const currentCredits = await creditsService.getUserCredits(req.user.id);
        
        console.log(`크레딧 확인: 사용자=${req.user.id}, 현재 크레딧=${currentCredits}, 필요 크레딧=${totalRequiredCredits} (${numImages}개 이미지 x ${creditsPerImage}크레딧)`);
        
        const hasCredits = await creditsService.hasEnoughCredits(
          req.user.id, 
          totalRequiredCredits
        );
        
        if (!hasCredits) {
          return res.status(402).json({ 
            success: false,
            message: `크레딧이 부족합니다. ${numImages}개 이미지 생성을 위해서는 ${totalRequiredCredits}개의 크레딧이 필요하지만, 현재 ${currentCredits}개의 크레딧만 보유하고 있습니다.`,
            requiredCredits: totalRequiredCredits,
            currentCredits: currentCredits
          });
        }
      }

      // 개발 모드이고 REPLICATE_API_TOKEN이 없으면 모의 데이터 반환
      const isDevelopmentWithoutApiToken = 
        process.env.NODE_ENV === 'development' && 
        !process.env.REPLICATE_API_TOKEN;

      if (isDevelopmentWithoutApiToken) {
        console.log('개발 모드에서 모의 이미지 데이터 반환');
        // 모의 이미지 URL 목록 반환
        const mockImages = [
          "https://replicate.delivery/pbxt/4WC1mpY71Rk0OZ8UcYZZ3wT9OggV9S1l9AkpQPrZDQ1cLQMRA/out-0.png",
          "https://replicate.delivery/pbxt/5JMY23w6ByHuZIV4iACF9xZWSsCY6aoUGCNk5RxMU9y8xQMRA/out-0.png",
          "https://replicate.delivery/pbxt/JGPxdQ8dRPTmYH6BKc3poVWTL7LV8DDEA0j4JX0F3aDmxQMRA/out-0.png"
        ];
        
        return res.json({ images: mockImages });
      }
      
      if (!process.env.REPLICATE_API_TOKEN) {
        throw new Error("REPLICATE_API_TOKEN is required");
      }

      console.log("이미지 생성 요청 프롬프트:", data.prompt);

      try {
        // Replicate API를 직접 호출 (Node.js 클라이언트 대신 fetch 사용)
        const prediction = await fetch(
          "https://api.replicate.com/v1/predictions",
          {
            method: "POST",
            headers: {
              Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              version: "black-forest-labs/flux-schnell",
              input: {
                prompt: data.prompt,
                go_fast: true,
                num_outputs: 3, // 3개의 이미지 생성
                aspect_ratio: "9:16", // 영화에 적합한 가로세로 비율
                output_format: "webp",
                output_quality: 80,
              },
            }),
          },
        );

        const predictionData = (await prediction.json()) as {
          id: string;
          status: string;
          output: string[] | null;
          error: string | null;
        };
        console.log(
          "Replicate 초기 응답:",
          JSON.stringify(predictionData).slice(0, 200) + "...",
        );

        // 결과가 완료될 때까지 폴링
        let imageUrls: string[] = [];
        let attempts = 0;
        const maxAttempts = 15; // 최대 시도 횟수 (약 30초)

        while (attempts < maxAttempts) {
          attempts++;

          // 진행 상태 확인
          const checkResponse = await fetch(
            `https://api.replicate.com/v1/predictions/${predictionData.id}`,
            {
              headers: {
                Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
              },
            },
          );

          const checkData = (await checkResponse.json()) as {
            status: string;
            output: string[] | null;
            error: string | null;
          };
          console.log(`폴링 시도 #${attempts} - 상태: ${checkData.status}`);

          if (checkData.status === "succeeded") {
            imageUrls = checkData.output || [];
            break;
          } else if (checkData.status === "failed" || checkData.error) {
            throw new Error(
              `Replicate API 실패: ${checkData.error || "Unknown error"}`,
            );
          }

          // 2초 대기
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        if (imageUrls.length === 0) {
          if (attempts >= maxAttempts) {
            throw new Error("시간 초과: 이미지 생성이 너무 오래 걸립니다");
          } else {
            throw new Error("이미지 URL을 받지 못했습니다");
          }
        }

        console.log("생성된 이미지 URL:", imageUrls);
        
        // Deduct credits after successful operation
        if (req.user) {
          console.log('Attempting to deduct credits for image generation...');
          const newBalance = await creditsService.deductCredits(
            req.user.id,
            totalRequiredCredits, // 이미지 생성에 15크레딧 필요
            "Image generation (3 images)"
          );
          console.log('Image generation credit deduction result:', newBalance);
        }
        
        res.json({ images: imageUrls });
      } catch (replicateError: any) {
        console.error("Replicate API 오류:", replicateError);
        res.status(500).json({ 
          success: false, 
          message: "Failed to generate images: " + (replicateError.message || "Unknown error") 
        });
      }
    } catch (error: any) {
      console.error("이미지 생성 오류:", error);
      res
        .status(500)
        .json({
          message:
            "Failed to generate images: " + (error.message || "Unknown error"),
        });
    }
  });

  // Describe image and generate video prompt
  app.post("/api/describe-image", async (req: Request & { user?: any }, res) => {
    try {
      const data = describeImageRequestSchema.parse(req.body);

      // Check if user is authenticated and has enough credits
      if (req.user) {
        const currentCredits = await creditsService.getUserCredits(req.user.id);
        const requiredCredits = CREDIT_COSTS.PROMPT_GENERATION;
        
        console.log(`크레딧 확인: 사용자=${req.user.id}, 현재 크레딧=${currentCredits}, 필요 크레딧=${requiredCredits}`);
        
        const hasCredits = await creditsService.hasEnoughCredits(
          req.user.id, 
          requiredCredits
        );
        
        if (!hasCredits) {
          return res.status(402).json({ 
            success: false,
            message: `크레딧이 부족합니다. 영상 프롬프트 생성을 위해서는 ${requiredCredits}개의 크레딧이 필요하지만, 현재 ${currentCredits}개의 크레딧만 보유하고 있습니다.`,
            requiredCredits: requiredCredits,
            currentCredits: currentCredits
          });
        }
      }

      console.log("영상 프롬프트 생성 요청:", data.image_url);

      try {
        const n8nWebhookUrl =
          "https://n8n.automationpro.online/webhook/7705292a-a192-4ab1-a238-c4bafd098ee1";

        // n8n 웹훅 호출
        const response = await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image_url: data.image_url,
          }),
        });

        if (!response.ok) {
          throw new Error(
            `API 응답 오류: ${response.status} ${response.statusText}`,
          );
        }

        const result = (await response.json()) as {
          video_prompt: string;
          negative_prompt: string;
        };
        console.log("영상 프롬프트 생성 결과:", result);

        // 응답 확인
        if (!result.video_prompt || !result.negative_prompt) {
          throw new Error("영상 프롬프트 생성 결과가 올바른 형식이 아닙니다");
        }

        // Deduct credits after successful operation (성공한 경우에만)
        if (req.user) {
          console.log('Attempting to deduct credits for video prompt generation...');
          const newBalance = await creditsService.deductCredits(
            req.user.id,
            CREDIT_COSTS.PROMPT_GENERATION,
            "Video prompt generation"
          );
          console.log('Video prompt generation credit deduction result:', newBalance);
        }

        // Return the video and negative prompts
        res.json({
          video_prompt: result.video_prompt,
          negative_prompt: result.negative_prompt,
        });
        
      } catch (apiError: any) {
        console.error("영상 프롬프트 생성 API 오류:", apiError);

        // API 오류 시 임시 응답 제공 (크레딧 차감 없음)
        const videoPrompts = [
          "A cinematic sequence showing the scene with dramatic lighting and atmosphere. Camera slowly moves from left to right, revealing the scene details.",
          "High-definition video capture of the scene. Camera starts with a wide establishing shot and gradually zooms in on the main subject.",
          "Atmospheric video sequence depicting the environment. Camera makes a slow vertical pan from bottom to top.",
          "Dynamic video footage with movement. Camera follows the action with smooth tracking shot.",
        ];

        const negativePrompts = [
          "low quality, blurry, distorted, pixelated, low resolution, oversaturated, amateur footage, shaky camera, out of focus",
          "text overlay, watermarks, logos, timestamps, jerky movement, digital artifacts, noise, grain, dust, scratches",
          "glitchy, over-sharpened, noisy, poorly edited, bad composition, distracting elements, incorrect colors",
          "low contrast, washed out colors, poor color grading, unstable footage, excessive zoom, poor white balance",
        ];

        const randomIndex = Math.floor(Math.random() * videoPrompts.length);

        console.log('API 오류로 인해 fallback 응답 제공 - 크레딧 차감 없음');
        res.json({
          video_prompt: videoPrompts[randomIndex],
          negative_prompt: negativePrompts[randomIndex],
        });
      }
    } catch (error: any) {
      console.error("영상 프롬프트 생성 요청 오류:", error);
      res
        .status(400)
        .json({
          message:
            "Invalid request data: " + (error.message || "Unknown error"),
        });
    }
  });

  // 영상 생성 API
  app.post("/api/generate-video", async (req: Request & { user?: any }, res) => {
    try {
      const data = generateVideoRequestSchema.parse(req.body);
      console.log("영상 생성 요청:", data);

      // Check if user is authenticated and has enough credits
      if (req.user) {
        const currentCredits = await creditsService.getUserCredits(req.user.id);
        const requiredCredits = CREDIT_COSTS.VIDEO_GENERATION;
        
        console.log(`크레딧 확인: 사용자=${req.user.id}, 현재 크레딧=${currentCredits}, 필요 크레딧=${requiredCredits}`);
        
        const hasCredits = await creditsService.hasEnoughCredits(
          req.user.id, 
          requiredCredits
        );
        
        if (!hasCredits) {
          return res.status(402).json({ 
            success: false,
            message: `크레딧이 부족합니다. 영상 생성을 위해서는 ${requiredCredits}개의 크레딧이 필요하지만, 현재 ${currentCredits}개의 크레딧만 보유하고 있습니다.`,
            requiredCredits: requiredCredits,
            currentCredits: currentCredits
          });
        }
      }

      // 개발 모드이고 FAL_KEY가 없으면 모의 데이터 반환
      const isDevelopmentWithoutApiKey = 
        process.env.NODE_ENV === 'development' && 
        !process.env.FAL_KEY;

      if (isDevelopmentWithoutApiKey) {
        console.log('개발 모드에서 모의 영상 생성 요청 처리');
        const mockRequestId = "mock-req-" + Date.now();
        
        // 요청 정보 캐시에 저장 (나중에 썸네일로 원본 이미지 사용)
        videoRequestCache.set(mockRequestId, {
          imageUrl: data.image_url,
          videoPrompt: data.video_prompt,
          negativePrompt: data.negative_prompt || ""
        });
        
        // Deduct credits after successful request submission
        if (req.user) {
          console.log('Attempting to deduct credits for video generation...');
          const newBalance = await creditsService.deductCredits(
            req.user.id,
            CREDIT_COSTS.VIDEO_GENERATION,
            "Video generation"
          );
          console.log('Video generation credit deduction result:', newBalance);
        }
        
        // 모의 응답 데이터 반환
        return res.json({ 
          request_id: mockRequestId,
          status: "pending",
          message: "Video generation request submitted successfully (mock)" 
        });
      }
      
      if (!process.env.FAL_KEY) {
        throw new Error("FAL_KEY is required");
      }

      try {
        // fal.ai에 영상 생성 요청 제출
        const result = await fal.queue.submit("fal-ai/kling-video/v1.6/standard/image-to-video", {
          input: {
            prompt: data.video_prompt,
            image_url: data.image_url,
            aspect_ratio: "9:16", // 세로 영상 (모바일)
            negative_prompt: data.negative_prompt || "blur, distort, and low quality"
          }
        });

        console.log("영상 생성 요청 ID:", result.request_id);
        
        // 요청 정보 캐시에 저장 (나중에 썸네일로 원본 이미지 사용)
        videoRequestCache.set(result.request_id, {
          imageUrl: data.image_url,
          videoPrompt: data.video_prompt,
          negativePrompt: data.negative_prompt || ""
        });
        
        // Deduct credits after successful request submission
        if (req.user) {
          console.log('Attempting to deduct credits for video generation...');
          const newBalance = await creditsService.deductCredits(
            req.user.id,
            CREDIT_COSTS.VIDEO_GENERATION,
            "Video generation"
          );
          console.log('Video generation credit deduction result:', newBalance);
        }
        
        // 요청 ID 반환 (비동기 처리)
        res.json({ 
          request_id: result.request_id,
          status: "pending"
        });
      } catch (falError: any) {
        console.error("fal.ai API 오류:", falError);
        res.status(500).json({ 
          message: "Failed to generate video: " + (falError.message || "Unknown error") 
        });
      }
    } catch (error: any) {
      console.error("영상 생성 요청 오류:", error);
      res.status(400).json({ 
        message: "Invalid request data: " + (error.message || "Unknown error") 
      });
    }
  });

  // 영상 상태 확인 API (POST 방식 - 클라이언트 호환성)
  app.post("/api/check-video-status", async (req, res) => {
    try {
      const { request_id } = req.body;

      if (!request_id) {
        return res.status(400).json({ 
          message: "Request ID is required" 
        });
      }

      // 개발 모드이고 FAL_KEY가 없으면 모의 데이터 반환
      const isDevelopmentWithoutApiKey = 
        process.env.NODE_ENV === 'development' && 
        !process.env.FAL_KEY;

      if (isDevelopmentWithoutApiKey) {
        console.log('개발 모드에서 모의 영상 상태 응답');
        
        // request_id에 mock-req가 포함되어 있으면 모의 데이터 반환
        if (request_id.includes('mock-req')) {
          // 요청 데이터 가져오기
          const requestData = videoRequestCache.get(request_id);
          let thumbnailUrl = "https://fal-cdn.com/default-thumbnail.jpg";
          
          if (requestData && requestData.imageUrl) {
            thumbnailUrl = requestData.imageUrl;
          }
          
          // 완료된 가상 응답 반환
          return res.json({
            status: "completed",
            video_url: "https://fal-cdn.com/v1/kl/sample-video.mp4",
            thumbnail_url: thumbnailUrl
          });
        }
        
        // 알 수 없는 request_id인 경우 대기 중인 것으로 처리
        return res.json({
          status: "pending",
          progress: "Processing... (mock)"
        });
      }
      
      if (!process.env.FAL_KEY) {
        throw new Error("FAL_KEY is required");
      }

      try {
        // fal.ai에 영상 생성 상태 확인
        const status = await fal.queue.status("fal-ai/kling-video/v1.6/standard/image-to-video", {
          requestId: request_id,
          logs: true
        });

        console.log("영상 생성 상태:", status.status);
        
        if (status.status === "COMPLETED") {
          // 영상 생성 완료 - 결과 가져오기
          const result = await fal.queue.result("fal-ai/kling-video/v1.6/standard/image-to-video", {
            requestId: request_id
          });
          
          // 생성된 영상 정보 반환
          console.log("영상 생성 결과:", JSON.stringify(result.data));
          
          // 영상 URL에서 썸네일 이미지 URL 생성 (JPG 확장자로)
          const videoUrl = result.data.video.url;
          let thumbnailUrl = videoUrl.replace(/\.[^/.]+$/, ".jpg");
          
          // 해당 요청의 원본 데이터 로드 (비디오 생성 시 사용된 이미지)
          try {
            // 영상 생성 요청 시 캐시에 저장된 정보 가져오기
            const requestData = videoRequestCache.get(request_id);
            
            // 요청 데이터가 있고 원본 이미지 URL이 있다면 그것을 사용
            if (requestData && requestData.imageUrl) {
              thumbnailUrl = requestData.imageUrl;
              console.log("원본 이미지를 썸네일로 사용:", thumbnailUrl);
            } else {
              console.log("캐시에서 이미지 URL을 찾을 수 없음, 기본값 사용:", thumbnailUrl);
            }
          } catch (err) {
            console.warn("이미지 URL 조회 실패:", err);
          }
          
          res.json({
            status: "completed",
            video_url: videoUrl,
            thumbnail_url: thumbnailUrl
          });
        } else if (status.status === "IN_QUEUE" || status.status === "IN_PROGRESS") {
          // 아직 처리 중 (IN_QUEUE 또는 IN_PROGRESS)
          // status.logs는 IN_PROGRESS 상태일 때만 사용 가능
          let progressMessage = "Processing...";
          
          if (status.status === "IN_PROGRESS" && Array.isArray(status.logs) && status.logs.length > 0) {
            progressMessage = status.logs[status.logs.length - 1].message;
          }
          
          res.json({
            status: "pending",
            progress: progressMessage
          });
        } else {
          // 그 외 모든 상태는 실패로 처리
          res.json({
            status: "failed", 
            error: "Video generation failed"
          });
        }
      } catch (falError: any) {
        console.error("fal.ai 상태 확인 오류:", falError);
        res.status(500).json({ 
          message: "Failed to check video status: " + (falError.message || "Unknown error") 
        });
      }
    } catch (error: any) {
      console.error("영상 상태 확인 요청 오류:", error);
      res.status(400).json({ 
        message: "Invalid request data: " + (error.message || "Unknown error") 
      });
    }
  });

  // Add credits route (admin only)
  app.post("/api/admin/add-credits", async (req: Request & { user?: any }, res) => {
    try {
      // Check if user is admin (you would need to add admin flag to user model)
      if (!req.user || !req.user.is_admin) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { userId, amount, description } = req.body;
      
      if (!userId || !amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid request data" });
      }
      
      const newBalance = await creditsService.addCredits(
        userId,
        amount,
        description || "Admin credit addition"
      );
      
      if (newBalance === null) {
        return res.status(400).json({ message: "Failed to add credits" });
      }
      
      res.json({ success: true, newBalance });
    } catch (error: any) {
      console.error("Add credits error:", error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  });
  
  // Get credit transactions
  app.get("/api/credits/transactions", async (req: Request & { user?: any }, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const transactions = await creditsService.getTransactionHistory(req.user.id);
      res.json({ transactions });
    } catch (error: any) {
      console.error("Get transactions error:", error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  });
  
  // Get credit balance
  app.get("/api/credits/balance", async (req: Request & { user?: any }, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const credits = await creditsService.getUserCredits(req.user.id);
      res.json({ credits: credits || 0 });
    } catch (error: any) {
      console.error("Get credit balance error:", error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Create session from token
  app.post("/api/auth/session-from-token", async (req, res) => {
    try {
      console.log("POST /api/auth/session-from-token - Request body:", req.body);
      console.log("Initial session ID:", req.session?.id || 'No session ID');
      
      const { access_token, refresh_token, type } = req.body;
      
      if (!access_token) {
        return res.status(400).json({ 
          success: false, 
          message: "Access token is required" 
        });
      }
      
      // 토큰에서 사용자 ID 추출 (JWT 디코딩)
      let userId = null;
      let email = null;
      
      try {
        // 향상된 JWT 디코딩 로직
        const tokenParts = access_token.split('.');
        if (tokenParts.length !== 3) {
          console.error('Token does not have three parts:', access_token.substring(0, 20) + '...');
          throw new Error('Invalid token format');
        }
        
        const base64Payload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
        const paddedBase64Payload = base64Payload.padEnd(base64Payload.length + (4 - (base64Payload.length % 4)) % 4, '=');
        
        console.log('Processing token base64 payload:', paddedBase64Payload.substring(0, 20) + '...');
        
        // Buffer로 디코딩
        try {
          const payloadBuffer = Buffer.from(paddedBase64Payload, 'base64');
          const payloadStr = payloadBuffer.toString();
          console.log('Decoded payload string (first 100 chars):', payloadStr.substring(0, 100));
          
          try {
            const payload = JSON.parse(payloadStr);
            console.log('Token payload parsed successfully:', payload);
            
            // Supabase는 sub 또는 user_id에 사용자 ID를 저장
            userId = payload.sub || payload.user_id || payload.id;
            email = payload.email;
            
            console.log('Extracted user ID from token:', userId);
            console.log('Extracted email from token:', email);
            
            if (!userId) {
              console.error('User ID not found in token payload');
              throw new Error('User ID not found in token');
            }
          } catch (jsonError) {
            console.error('JSON parse error:', jsonError);
            throw new Error('Failed to parse token payload JSON: ' + payloadStr.substring(0, 50));
          }
        } catch (bufferError) {
          console.error('Buffer decoding error:', bufferError);
          console.error('Failed base64 payload:', paddedBase64Payload.substring(0, 50));
          throw new Error('Failed to decode token payload from base64');
        }
      } catch (tokenError) {
        console.error('Token decoding error:', tokenError);
        return res.status(400).json({ 
          success: false, 
          message: "Invalid token format: " + (tokenError instanceof Error ? tokenError.message : String(tokenError))
        });
      }
      
      // 세션 생성 및 저장
      req.session.userId = userId;
      console.log("New session created with ID:", req.session?.id || 'Unknown');
      console.log("Session user ID set to:", req.session.userId);
      
      // Supabase 테이블에 사용자 추가 (없는 경우)
      if (email) {
        try {
          console.log('Checking if user exists in database...');
          const { data: existingUser, error: queryError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (queryError && queryError.code !== 'PGRST116') {
            console.error('Database error during user lookup:', queryError);
            // 오류가 발생했지만 인증은 계속 진행
          }
          
          if (!existingUser && queryError?.code === 'PGRST116') {
            console.log('User not found in database, creating new user with ID:', userId);
            
            try {
              const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert([
                  { 
                    id: userId, 
                    email: email,
                    credits: 100, // 초기 크레딧
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }
                ])
                .select();
                
              if (insertError) {
                console.error('Error creating new user in database:', insertError);
                console.error('Insert error details:', {
                  code: insertError.code,
                  message: insertError.message,
                  details: insertError.details,
                  hint: insertError.hint
                });
              } else {
                console.log('Successfully created new user in database:', newUser);
              }
            } catch (insertErr) {
              console.error('Exception during user creation:', insertErr);
            }
          } else if (existingUser) {
            console.log('Found existing user in database:', existingUser.email);
          }
        } catch (dbError) {
          console.error('Database operation error:', dbError);
          // DB 오류는 로그만 남기고 진행 (인증은 계속 진행)
        }
      } else {
        console.warn('No email available from token, skipping user creation');
      }
      
      // 세션이 저장될 때까지 기다림
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Failed to save session:", err);
            reject(err);
          } else {
            console.log("Session successfully saved");
            resolve();
          }
        });
      });
      
      console.log('Session created for user ID:', userId, 'Session ID:', req.session?.id || 'Unknown');
      
      // 쿠키 헤더 설정 확인
      const cookies = res.getHeader('Set-Cookie');
      console.log("Response cookie headers:", cookies ? JSON.stringify(cookies) : 'No cookies set');
      
      // 세션 쿠키 확인 및 강제 설정
      if (!cookies || (Array.isArray(cookies) && cookies.length === 0)) {
        console.log('Attempting to explicitly set session cookie');
        // 세션 ID 기반 쿠키 설정
        const cookieOptions = {
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // 1일
          path: '/',
          sameSite: 'lax' as const,
          secure: false
        };
        
        res.cookie('scenario_sid', req.session.id, cookieOptions);
        
        // 새 쿠키 헤더 확인
        const newCookies = res.getHeader('Set-Cookie');
        console.log("New cookie headers after explicit setting:", JSON.stringify(newCookies));
      }
      
      res.json({ 
        success: true, 
        message: "Authentication successful",
        userId: userId
      });
    } catch (error: any) {
      console.error("Session from token error:", error);
      res.status(500).json({ 
        success: false, 
        message: error.message || "Server error" 
      });
    }
  });

  const server = createServer(app);
  return server;
}
