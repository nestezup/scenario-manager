import type { Express } from "express";
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

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes for our POC application

  // Parse scenes from synopsis
  app.post("/api/parse-scenes", async (req, res) => {
    try {
      const data = parseSceneRequestSchema.parse(req.body);

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
              synopsis: data.synopsis,
              scene_count: data.scene_count,
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
  app.post("/api/generate-image-prompt", async (req, res) => {
    try {
      const data = imagePromptRequestSchema.parse(req.body);

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
  app.post("/api/generate-images", async (req, res) => {
    try {
      const data = generateImageRequestSchema.parse(req.body);

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
        res.json({ images: imageUrls });
      } catch (replicateError: any) {
        console.error("Replicate API 오류:", replicateError);

        // API 오류 시 임시로 가상 이미지 제공 (테스트용)
        const fallbackImages = [
          "https://images.unsplash.com/photo-1516214104703-d870798883c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1620332372374-f108c53d2e03?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
          "https://images.unsplash.com/photo-1590523278191-995cbcda646b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        ];

        res.json({ images: fallbackImages });
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
  app.post("/api/describe-image", async (req, res) => {
    try {
      const data = describeImageRequestSchema.parse(req.body);

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

        res.json({
          video_prompt: result.video_prompt,
          negative_prompt: result.negative_prompt,
        });
      } catch (apiError: any) {
        console.error("영상 프롬프트 생성 API 오류:", apiError);

        // API 오류 시 임시 응답 제공
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

  // 영상 생성 API 엔드포인트
  app.post("/api/generate-video", async (req, res) => {
    try {
      if (!process.env.FAL_KEY) {
        throw new Error("FAL_KEY is required");
      }

      const data = generateVideoRequestSchema.parse(req.body);
      console.log("영상 생성 요청:", data);

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

  // 영상 생성 상태 확인 API 엔드포인트
  app.post("/api/check-video-status", async (req, res) => {
    try {
      if (!process.env.FAL_KEY) {
        throw new Error("FAL_KEY is required");
      }

      const data = checkVideoStatusRequestSchema.parse(req.body);
      console.log("영상 생성 상태 확인 요청:", data.request_id);

      try {
        // fal.ai에 영상 생성 상태 확인
        const status = await fal.queue.status("fal-ai/kling-video/v1.6/standard/image-to-video", {
          requestId: data.request_id,
          logs: true
        });

        console.log("영상 생성 상태:", status.status);
        
        if (status.status === "COMPLETED") {
          // 영상 생성 완료 - 결과 가져오기
          const result = await fal.queue.result("fal-ai/kling-video/v1.6/standard/image-to-video", {
            requestId: data.request_id
          });
          
          // 생성된 영상 정보 반환
          res.json({
            status: "completed",
            video_url: result.data.video.url,
            thumbnail_url: result.data.video.url.replace(/\.[^/.]+$/, ".jpg") // 썸네일은 같은 경로의 jpg 파일로 가정
          });
        } else if (status.status === "FAILED") {
          res.json({
            status: "failed", 
            error: "Video generation failed"
          });
        } else {
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

  const httpServer = createServer(app);
  return httpServer;
}
