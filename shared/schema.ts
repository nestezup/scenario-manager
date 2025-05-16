import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Since this is a POC with no login/save functionality,
// we'll keep a minimal schema structure just for the API types

export const scenes = pgTable("scenes", {
  id: serial("id").primaryKey(),
  synopsisId: integer("synopsis_id").notNull(),
  text: text("text").notNull(),
  order: integer("order").notNull(),
});

export const insertSceneSchema = createInsertSchema(scenes).pick({
  text: true,
  order: true,
});

export const imagePrompts = pgTable("image_prompts", {
  id: serial("id").primaryKey(),
  sceneId: integer("scene_id").notNull(),
  prompt: text("prompt").notNull(),
});

export const insertImagePromptSchema = createInsertSchema(imagePrompts).pick({
  sceneId: true,
  prompt: true,
});

export const videoPrompts = pgTable("video_prompts", {
  id: serial("id").primaryKey(),
  sceneId: integer("scene_id").notNull(),
  videoPrompt: text("video_prompt").notNull(),
  negativePrompt: text("negative_prompt").notNull(),
  imageUrl: text("image_url").notNull(),
});

export const insertVideoPromptSchema = createInsertSchema(videoPrompts).pick({
  sceneId: true,
  videoPrompt: true,
  negativePrompt: true,
  imageUrl: true,
});

// API request and response types
export const parseSceneRequestSchema = z.object({
  synopsis: z.string().min(1),
  scene_count: z.number().min(5).max(20),
});

export const imagePromptRequestSchema = z.object({
  scene_text: z.string().min(1),
});

export const generateImageRequestSchema = z.object({
  prompt: z.string().min(1),
});

export const describeImageRequestSchema = z.object({
  image_url: z.string().min(1),
});

export type Scene = typeof scenes.$inferSelect;
export type InsertScene = typeof scenes.$inferInsert;
export type ImagePrompt = typeof imagePrompts.$inferSelect;
export type InsertImagePrompt = typeof imagePrompts.$inferInsert;
export type VideoPrompt = typeof videoPrompts.$inferSelect;
export type InsertVideoPrompt = typeof videoPrompts.$inferInsert;

export type ParseSceneRequest = z.infer<typeof parseSceneRequestSchema>;
export type ImagePromptRequest = z.infer<typeof imagePromptRequestSchema>;
export type GenerateImageRequest = z.infer<typeof generateImageRequestSchema>;
export type DescribeImageRequest = z.infer<typeof describeImageRequestSchema>;

// 영상 생성 요청 스키마
export const generateVideoRequestSchema = z.object({
  image_url: z.string(),
  video_prompt: z.string(),
  negative_prompt: z.string().optional()
});

export type GenerateVideoRequest = z.infer<typeof generateVideoRequestSchema>;

// 영상 생성 진행 상태 확인 스키마
export const checkVideoStatusRequestSchema = z.object({
  request_id: z.string()
});

export type CheckVideoStatusRequest = z.infer<typeof checkVideoStatusRequestSchema>;
