// netlify/functions/api.ts
import express from "express";
import serverless from "serverless-http";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv2 from "dotenv";

// server/routes.ts
import { createServer } from "http";
import fetch from "node-fetch";
import Replicate from "replicate";
import { fal } from "@fal-ai/client";

// shared/schema.ts
import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var scenes = pgTable("scenes", {
  id: serial("id").primaryKey(),
  synopsisId: integer("synopsis_id").notNull(),
  text: text("text").notNull(),
  order: integer("order").notNull()
});
var insertSceneSchema = createInsertSchema(scenes).pick({
  text: true,
  order: true
});
var imagePrompts = pgTable("image_prompts", {
  id: serial("id").primaryKey(),
  sceneId: integer("scene_id").notNull(),
  prompt: text("prompt").notNull()
});
var insertImagePromptSchema = createInsertSchema(imagePrompts).pick({
  sceneId: true,
  prompt: true
});
var videoPrompts = pgTable("video_prompts", {
  id: serial("id").primaryKey(),
  sceneId: integer("scene_id").notNull(),
  videoPrompt: text("video_prompt").notNull(),
  negativePrompt: text("negative_prompt").notNull(),
  imageUrl: text("image_url").notNull()
});
var insertVideoPromptSchema = createInsertSchema(videoPrompts).pick({
  sceneId: true,
  videoPrompt: true,
  negativePrompt: true,
  imageUrl: true
});
var parseSceneRequestSchema = z.object({
  synopsis: z.string().min(1),
  scene_count: z.number().min(3).max(20)
});
var imagePromptRequestSchema = z.object({
  scene_text: z.string().min(1)
});
var generateImageRequestSchema = z.object({
  prompt: z.string().min(1)
});
var describeImageRequestSchema = z.object({
  image_url: z.string().min(1)
});
var generateVideoRequestSchema = z.object({
  image_url: z.string(),
  video_prompt: z.string(),
  negative_prompt: z.string().optional()
});
var checkVideoStatusRequestSchema = z.object({
  request_id: z.string()
});

// server/supabase.ts
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
var supabaseUrl = process.env.SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      console.log("Reading .env file directly from:", envPath);
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      supabaseUrl = envConfig.SUPABASE_URL;
      supabaseKey = envConfig.SUPABASE_SERVICE_KEY;
      console.log("Loaded Supabase credentials directly from .env file");
    }
  } catch (error) {
    console.error("Error reading .env file:", error);
  }
}
console.log("===== SUPABASE CONFIGURATION DEBUG =====");
console.log("SUPABASE_URL:", supabaseUrl ? supabaseUrl : "NOT SET");
console.log("SUPABASE_SERVICE_KEY:", supabaseKey ? `LOADED (length: ${supabaseKey.length})` : "NOT SET");
console.log("URL and KEY are both set:", Boolean(supabaseUrl && supabaseKey));
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("=========================================");
var isDevelopmentWithoutSupabase = false;
console.log("Using mock Supabase client:", isDevelopmentWithoutSupabase);
if (isDevelopmentWithoutSupabase) {
  console.warn("Running in development mode without Supabase credentials. Authentication and database features will be mocked.");
} else if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
} else {
  console.log("Using real Supabase client with provided credentials");
}
var createMockClient = () => {
  return {
    auth: {
      signInWithOtp: async ({ email }) => {
        console.log(`[MOCK] Sending magic link to ${email}`);
        return {
          data: { user: { email } },
          error: null
        };
      },
      exchangeCodeForSession: async (code) => {
        console.log(`[MOCK] Exchanging code for session: ${code}`);
        return {
          data: {
            user: { id: "mock-user-id", email: "mock@example.com" }
          },
          error: null
        };
      }
    },
    from: (table) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: table === "users" ? { id: "mock-user-id", email: "mock@example.com", credits: 100 } : {},
            error: null
          }),
          order: () => ({
            data: table === "credit_transactions" ? [{
              id: "mock-tx-1",
              amount: 10,
              transaction_type: "credit",
              created_at: (/* @__PURE__ */ new Date()).toISOString(),
              description: "Initial credits"
            }] : [],
            error: null
          })
        })
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: { id: "new-record-id" },
            error: null
          })
        })
      }),
      update: () => ({
        eq: async () => ({ data: {}, error: null })
      })
    })
  };
};
var supabaseClient;
try {
  if (!isDevelopmentWithoutSupabase && supabaseUrl && supabaseKey) {
    console.log("Creating Supabase client with URL:", supabaseUrl);
    console.log("Service Key starts with:", supabaseKey.substring(0, 10) + "...");
    try {
      new URL(supabaseUrl);
    } catch (e) {
      console.error("Invalid Supabase URL format:", e);
    }
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    (async () => {
      try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) {
          console.warn("Supabase session test failed:", error.message);
        } else {
          console.log("Supabase session test succeeded:", data ? "Session data exists" : "No session");
        }
      } catch (e) {
        console.error("Supabase session test error:", e);
      }
    })();
    console.log("Successfully created real Supabase client");
  } else {
    supabaseClient = createMockClient();
    console.log("Using mock Supabase client");
  }
} catch (error) {
  console.error("Error creating Supabase client:", error);
  supabaseClient = createMockClient();
  console.log("Falling back to mock Supabase client due to error");
}
var supabase = supabaseClient;

// server/services/auth.service.ts
var AuthService = class {
  // 최근 전송된 매직 링크 요청을 추적하는 메모리 캐시
  recentMagicLinkRequests = /* @__PURE__ */ new Map();
  /**
   * Send a magic link to the user's email
   * @param email The user's email address
   * @returns Result of the magic link operation
   */
  async sendMagicLink(email) {
    try {
      console.log(`Attempting to send magic link to: ${email}`);
      const now = Date.now();
      const lastRequestTime = this.recentMagicLinkRequests.get(email);
      if (lastRequestTime && now - lastRequestTime < 3e4) {
        console.log(`Rate limiting magic link for ${email} - last request was ${(now - lastRequestTime) / 1e3} seconds ago`);
        return {
          success: true,
          data: { rateLimited: true },
          message: "Magic link was recently sent. Please wait before requesting another one."
        };
      }
      this.recentMagicLinkRequests.set(email, now);
      setTimeout(() => {
        this.recentMagicLinkRequests.delete(email);
      }, 5 * 60 * 1e3);
      try {
        console.log("Calling Supabase auth.signInWithOtp for email:", email);
        const { data, error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${process.env.APP_URL || "http://localhost:3000"}/auth/callback`
          }
        });
        if (error) {
          console.error("Supabase error sending magic link:", error);
          throw error;
        }
        console.log("Successfully sent magic link via Supabase to:", email);
        if (process.env.NODE_ENV === "development") {
          console.log("====================================");
          console.log("DEVELOPMENT MODE: Magic Link Email was ACTUALLY SENT");
          console.log("------------------------------------");
          console.log(`Email address: ${email}`);
          console.log(`Check your email for the login link`);
          console.log("====================================");
        }
        return { success: true, data };
      } catch (supabaseError) {
        console.error("Exception calling Supabase auth.signInWithOtp:", supabaseError);
        throw supabaseError;
      }
    } catch (error) {
      console.error("Failed to send magic link:", error);
      return { success: false, error };
    }
  }
  /**
   * Get user by their ID
   * @param userId User ID
   * @returns User data or null if not found
   */
  async getUserById(userId) {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();
      if (error) {
        console.error("Error fetching user:", error);
        return null;
      }
      return data;
    } catch (error) {
      console.error("Failed to get user:", error);
      return null;
    }
  }
  /**
   * Get user by their email
   * @param email User email
   * @returns User data or null if not found
   */
  async getUserByEmail(email) {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("email", email).single();
      if (error) {
        console.error("Error fetching user by email:", error);
        return null;
      }
      return data;
    } catch (error) {
      console.error("Failed to get user by email:", error);
      return null;
    }
  }
  /**
   * Create a new user in the database
   * @param userData User data to create
   * @returns Created user data
   */
  async createUser(userData) {
    try {
      const { data, error } = await supabase.from("users").insert([
        {
          id: userData.id,
          email: userData.email,
          credits: 100,
          // Give new users 100 free credits
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }
      ]).select().single();
      if (error) {
        console.error("Error creating user:", error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error("Failed to create user:", error);
      throw error;
    }
  }
};

// server/services/credits.service.ts
var CreditsService = class {
  /**
   * Get the current credit balance for a user
   * @param userId User ID
   * @returns Current credit balance or null if error
   */
  async getUserCredits(userId) {
    try {
      const { data, error } = await supabase.from("users").select("credits").eq("id", userId).single();
      if (error) {
        console.error("Error fetching user credits:", error);
        return null;
      }
      return data?.credits || 0;
    } catch (error) {
      console.error("Failed to get user credits:", error);
      return null;
    }
  }
  /**
   * Add credits to a user's account
   * @param userId User ID
   * @param amount Amount of credits to add
   * @param description Description of the transaction
   * @returns Updated credit balance or null if error
   */
  async addCredits(userId, amount, description) {
    try {
      const { data: user, error: userError } = await supabase.from("users").select("credits").eq("id", userId).single();
      if (userError) {
        console.error("Error fetching user for credit addition:", userError);
        return null;
      }
      const currentCredits = user?.credits || 0;
      const newCredits = currentCredits + amount;
      const { error: updateError } = await supabase.from("users").update({ credits: newCredits, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", userId);
      if (updateError) {
        console.error("Error updating user credits:", updateError);
        return null;
      }
      const { error: transactionError } = await supabase.from("credits_transactions").insert([
        {
          user_id: userId,
          amount,
          transaction_type: "credit",
          description,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        }
      ]);
      if (transactionError) {
        console.error("Error recording credit transaction:", transactionError);
      }
      return newCredits;
    } catch (error) {
      console.error("Failed to add credits:", error);
      return null;
    }
  }
  /**
   * Deduct credits from a user's account
   * @param userId User ID
   * @param amount Amount of credits to deduct
   * @param description Description of the transaction
   * @returns Updated credit balance or null if error
   */
  async deductCredits(userId, amount, description) {
    try {
      const { data: user, error: userError } = await supabase.from("users").select("credits").eq("id", userId).single();
      if (userError) {
        console.error("Error fetching user for credit deduction:", userError);
        return null;
      }
      const currentCredits = user?.credits || 0;
      if (currentCredits < amount) {
        console.error("Insufficient credits:", { userId, currentCredits, requiredAmount: amount });
        return null;
      }
      const newCredits = currentCredits - amount;
      const { error: updateError } = await supabase.from("users").update({ credits: newCredits, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", userId);
      if (updateError) {
        console.error("Error updating user credits:", updateError);
        return null;
      }
      const { error: transactionError } = await supabase.from("credits_transactions").insert([
        {
          user_id: userId,
          amount,
          transaction_type: "debit",
          description,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        }
      ]);
      if (transactionError) {
        console.error("Error recording debit transaction:", transactionError);
      }
      return newCredits;
    } catch (error) {
      console.error("Failed to deduct credits:", error);
      return null;
    }
  }
  /**
   * Check if user has enough credits for an operation
   * @param userId User ID
   * @param requiredAmount Amount of credits required
   * @returns Boolean indicating if user has enough credits
   */
  async hasEnoughCredits(userId, requiredAmount) {
    const credits = await this.getUserCredits(userId);
    return credits !== null && credits >= requiredAmount;
  }
  /**
   * Get transaction history for a user
   * @param userId User ID
   * @returns Array of transaction records
   */
  async getTransactionHistory(userId) {
    try {
      const { data, error } = await supabase.from("credits_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching transaction history:", error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error("Failed to get transaction history:", error);
      return [];
    }
  }
};

// server/routes.ts
import { z as z2 } from "zod";
var authService = new AuthService();
var creditsService = new CreditsService();
var replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || ""
});
if (process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY
  });
}
var videoRequestCache = /* @__PURE__ */ new Map();
var signupSchema = z2.object({
  email: z2.string().email()
});
var magicLinkSchema = z2.object({
  email: z2.string().email()
});
var CREDIT_COSTS = {
  IMAGE_GENERATION: 5,
  PROMPT_GENERATION: 5,
  VIDEO_GENERATION: 10,
  SCENE_PARSING: 5
};
var magicLinkRateLimit = /* @__PURE__ */ new Map();
var RATE_LIMIT_DURATION = 6e4;
async function registerRoutes(app2) {
  app2.use("/api", (err, req, res, next) => {
    if (err) {
      console.error("API error middleware caught:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Server error"
      });
    }
    next();
  });
  app2.post("/api/magic-link", async (req, res) => {
    try {
      console.log("POST /api/magic-link - Request body:", req.body);
      const { email } = magicLinkSchema.parse(req.body);
      console.log("Parsed email:", email);
      const now = Date.now();
      const lastRequest = magicLinkRateLimit.get(email);
      if (lastRequest && now - lastRequest < RATE_LIMIT_DURATION) {
        const remainingTime = Math.ceil((RATE_LIMIT_DURATION - (now - lastRequest)) / 1e3);
        console.log(`Rate limit hit for ${email}, ${remainingTime}s remaining`);
        return res.status(429).json({
          success: false,
          message: `A magic link was recently sent to this email. Please wait ${remainingTime} seconds before requesting another.`
        });
      }
      magicLinkRateLimit.set(email, now);
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
        magicLinkRateLimit.delete(email);
        res.status(400).json({
          success: false,
          message: "Failed to send magic link. Please try again."
        });
      }
    } catch (error) {
      console.error("Magic link error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Invalid request data"
      });
    }
  });
  app2.get("/api/me", async (req, res) => {
    try {
      console.log("=== /api/me ENDPOINT REACHED ===");
      console.log("GET /api/me - \uC138\uC158 ID:", req.session?.id || "No session ID");
      console.log("GET /api/me - \uC138\uC158 \uC0AC\uC6A9\uC790 ID:", req.session?.userId || "No user ID");
      console.log("GET /api/me - Request headers:", req.headers);
      const authHeader = req.headers.authorization;
      let userId = req.user?.id || req.session?.userId;
      let bearerToken = null;
      if (!userId && !authHeader) {
        console.log("No userId in session and no Authorization header, returning not authenticated");
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          bearerToken = authHeader.substring(7);
          console.log("Authorization \uD5E4\uB354\uC5D0\uC11C \uD1A0\uD070 \uCD94\uCD9C:", bearerToken ? bearerToken.substring(0, 20) + "..." : "\uC5C6\uC74C");
          try {
            const tokenParts = bearerToken.split(".");
            if (tokenParts.length === 3) {
              const base64Payload = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
              const paddedBase64Payload = base64Payload.padEnd(base64Payload.length + (4 - base64Payload.length % 4) % 4, "=");
              try {
                const payloadBuffer = Buffer.from(paddedBase64Payload, "base64");
                const payloadStr = payloadBuffer.toString();
                const payload = JSON.parse(payloadStr);
                const tokenUserId = payload.sub || payload.user_id || payload.id;
                if (tokenUserId) {
                  console.log("\uD1A0\uD070\uC5D0\uC11C \uCD94\uCD9C\uD55C \uC0AC\uC6A9\uC790 ID:", tokenUserId);
                  userId = tokenUserId;
                }
              } catch (err) {
                console.error("\uD1A0\uD070 \uD398\uC774\uB85C\uB4DC \uD30C\uC2F1 \uC624\uB958:", err);
              }
            }
          } catch (err) {
            console.error("\uD1A0\uD070 \uB514\uCF54\uB529 \uC624\uB958:", err);
          }
        } catch (tokenError) {
          console.error("Token extraction error:", tokenError);
        }
      }
      if (!userId) {
        console.log("Could not determine userId from session or token");
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }
      console.log("Using userId for /api/me:", userId);
      let email = req.user?.email || "";
      let credits = 0;
      try {
        const { data: userData, error } = await supabase.from("users").select("*").eq("id", userId).single();
        if (error) {
          console.error("Error fetching user from DB in /api/me:", error);
          if (error.code === "PGRST116") {
            console.log("User not found, attempting to create user with ID:", userId);
            try {
              const { data: newUser, error: insertError } = await supabase.from("users").insert([
                {
                  id: userId,
                  email: email || `user-${userId.substring(0, 8)}@example.com`,
                  credits: 100,
                  // 초기 크레딧
                  created_at: (/* @__PURE__ */ new Date()).toISOString(),
                  updated_at: (/* @__PURE__ */ new Date()).toISOString()
                }
              ]).select();
              if (insertError) {
                console.error("Failed to create user:", insertError);
                return res.status(500).json({
                  success: false,
                  message: "Failed to create user record"
                });
              }
              if (newUser && newUser.length > 0) {
                console.log("Created new user:", newUser[0]);
                req.user = newUser[0];
                userId = newUser[0].id;
                email = newUser[0].email;
                credits = newUser[0].credits || 0;
              }
            } catch (createError) {
              console.error("Error creating user:", createError);
              return res.status(500).json({
                success: false,
                message: "Error creating user"
              });
            }
          } else {
            return res.status(500).json({
              success: false,
              message: "Database error"
            });
          }
        } else if (userData) {
          req.user = userData;
          userId = userData.id;
          email = userData.email;
          try {
            credits = await creditsService.getUserCredits(userId) || 0;
          } catch (creditError) {
            console.error("Error fetching credits:", creditError);
            credits = 0;
          }
        }
        return res.json({
          success: true,
          id: userId,
          email,
          credits
        });
      } catch (dbError) {
        console.error("Database error in /api/me:", dbError);
        return res.status(500).json({
          success: false,
          message: "Server error fetching user data"
        });
      }
    } catch (generalError) {
      console.error("General error in /api/me:", generalError);
      return res.status(500).json({
        success: false,
        message: "Server error"
      });
    }
  });
  app2.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Failed to logout" });
      }
      res.json({ success: true, message: "Logged out successfully" });
    });
  });
  app2.post("/api/parse-scenes", async (req, res) => {
    try {
      console.log("=== PARSE SCENES REQUEST DEBUG ===");
      console.log("Raw request body:", req.body);
      console.log("Request body type:", typeof req.body);
      console.log("Scene count value:", req.body.scene_count);
      console.log("Scene count type:", typeof req.body.scene_count);
      console.log("================================");
      const { synopsis, scene_count } = parseSceneRequestSchema.parse(req.body);
      if (req.user) {
        const currentCredits = await creditsService.getUserCredits(req.user.id);
        const requiredCredits = CREDIT_COSTS.SCENE_PARSING;
        console.log(`\uD06C\uB808\uB527 \uD655\uC778: \uC0AC\uC6A9\uC790=${req.user.id}, \uD604\uC7AC \uD06C\uB808\uB527=${currentCredits}, \uD544\uC694 \uD06C\uB808\uB527=${requiredCredits}`);
        const hasCredits = await creditsService.hasEnoughCredits(
          req.user.id,
          requiredCredits
        );
        if (!hasCredits) {
          return res.status(402).json({
            success: false,
            message: `\uD06C\uB808\uB527\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4. \uC52C \uD30C\uC2F1\uC744 \uC704\uD574\uC11C\uB294 ${requiredCredits}\uAC1C\uC758 \uD06C\uB808\uB527\uC774 \uD544\uC694\uD558\uC9C0\uB9CC, \uD604\uC7AC ${currentCredits}\uAC1C\uC758 \uD06C\uB808\uB527\uB9CC \uBCF4\uC720\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.`,
            requiredCredits,
            currentCredits: currentCredits || 0
          });
        }
      }
      const response = await fetch(
        "https://dify.slowcampus.kr/v1/workflows/run",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer app-twgpaqfPDJR2XU3qnjy6Q9LM",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            inputs: {
              synopsis,
              scene_count
            },
            // 스트리밍 대신 blocking 모드 사용
            response_mode: "blocking",
            user: "user-" + Math.random().toString(36).substring(2, 10)
          })
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dify API error: ${errorText}`);
      }
      const difyData = await response.json();
      if (!difyData.data?.outputs?.text) {
        throw new Error(
          "Dify API \uC751\uB2F5\uC5D0 \uD544\uC694\uD55C \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4: " + JSON.stringify(difyData)
        );
      }
      const scenes2 = JSON.parse(difyData.data.outputs.text);
      console.log("Parsed scenes from Dify:", scenes2);
      console.log("Number of scenes:", scenes2.length);
      if (req.user) {
        console.log("Attempting to deduct credits for scene parsing...");
        const newBalance = await creditsService.deductCredits(
          req.user.id,
          CREDIT_COSTS.SCENE_PARSING,
          "Scene parsing from synopsis"
        );
        console.log("Credit deduction result:", newBalance);
      }
      console.log("Sending scenes response to client:", scenes2.length, "scenes");
      res.json(scenes2);
    } catch (error) {
      console.error("Scene parsing error:", error);
      res.status(500).json({
        message: "Failed to parse scenes: " + (error.message || "Unknown error")
      });
    }
  });
  app2.post("/api/generate-image-prompt", async (req, res) => {
    try {
      const data = imagePromptRequestSchema.parse(req.body);
      if (req.user) {
        const currentCredits = await creditsService.getUserCredits(req.user.id);
        const requiredCredits = CREDIT_COSTS.PROMPT_GENERATION;
        console.log(`\uD06C\uB808\uB527 \uD655\uC778: \uC0AC\uC6A9\uC790=${req.user.id}, \uD604\uC7AC \uD06C\uB808\uB527=${currentCredits}, \uD544\uC694 \uD06C\uB808\uB527=${requiredCredits}`);
        const hasCredits = await creditsService.hasEnoughCredits(
          req.user.id,
          requiredCredits
        );
        if (!hasCredits) {
          return res.status(402).json({
            success: false,
            message: `\uD06C\uB808\uB527\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4. \uC774\uBBF8\uC9C0 \uD504\uB86C\uD504\uD2B8 \uC0DD\uC131\uC744 \uC704\uD574\uC11C\uB294 ${requiredCredits}\uAC1C\uC758 \uD06C\uB808\uB527\uC774 \uD544\uC694\uD558\uC9C0\uB9CC, \uD604\uC7AC ${currentCredits}\uAC1C\uC758 \uD06C\uB808\uB527\uB9CC \uBCF4\uC720\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.`,
            requiredCredits,
            currentCredits: currentCredits || 0
          });
        }
      }
      const response = await fetch(
        "https://dify.slowcampus.kr/v1/workflows/run",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer app-3iMrcMZH02bGoXNqKLVpCdDF",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            inputs: {
              scene_text: data.scene_text
            },
            response_mode: "blocking",
            user: "user-" + Math.random().toString(36).substring(2, 10)
          })
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dify API error: ${errorText}`);
      }
      const difyData = await response.json();
      if (!difyData.data?.outputs?.text) {
        throw new Error(
          "Dify API \uC751\uB2F5\uC5D0 \uD544\uC694\uD55C \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4: " + JSON.stringify(difyData)
        );
      }
      const imagePromptData = JSON.parse(difyData.data.outputs.text);
      if (imagePromptData.prompt) {
        imagePromptData.prompt = imagePromptData.prompt.replace(/--ar 16:9/g, "");
        console.log("\uC218\uC815\uB41C \uC774\uBBF8\uC9C0 \uD504\uB86C\uD504\uD2B8:", imagePromptData.prompt);
      }
      if (req.user) {
        await creditsService.deductCredits(
          req.user.id,
          CREDIT_COSTS.PROMPT_GENERATION,
          "Image prompt generation"
        );
      }
      res.json(imagePromptData);
    } catch (error) {
      console.error("Image prompt generation error:", error);
      res.status(500).json({
        message: "Failed to generate image prompt: " + (error.message || "Unknown error")
      });
    }
  });
  app2.post("/api/generate-images", async (req, res) => {
    try {
      const data = generateImageRequestSchema.parse(req.body);
      const numImages = 3;
      const creditsPerImage = CREDIT_COSTS.IMAGE_GENERATION;
      const totalRequiredCredits = creditsPerImage * numImages;
      if (req.user) {
        const currentCredits = await creditsService.getUserCredits(req.user.id);
        console.log(`\uD06C\uB808\uB527 \uD655\uC778: \uC0AC\uC6A9\uC790=${req.user.id}, \uD604\uC7AC \uD06C\uB808\uB527=${currentCredits}, \uD544\uC694 \uD06C\uB808\uB527=${totalRequiredCredits} (${numImages}\uAC1C \uC774\uBBF8\uC9C0 x ${creditsPerImage}\uD06C\uB808\uB527)`);
        const hasCredits = await creditsService.hasEnoughCredits(
          req.user.id,
          totalRequiredCredits
        );
        if (!hasCredits) {
          return res.status(402).json({
            success: false,
            message: `\uD06C\uB808\uB527\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4. ${numImages}\uAC1C \uC774\uBBF8\uC9C0 \uC0DD\uC131\uC744 \uC704\uD574\uC11C\uB294 ${totalRequiredCredits}\uAC1C\uC758 \uD06C\uB808\uB527\uC774 \uD544\uC694\uD558\uC9C0\uB9CC, \uD604\uC7AC ${currentCredits}\uAC1C\uC758 \uD06C\uB808\uB527\uB9CC \uBCF4\uC720\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.`,
            requiredCredits: totalRequiredCredits,
            currentCredits
          });
        }
      }
      const isDevelopmentWithoutApiToken = process.env.NODE_ENV === "development" && !process.env.REPLICATE_API_TOKEN;
      if (isDevelopmentWithoutApiToken) {
        console.log("\uAC1C\uBC1C \uBAA8\uB4DC\uC5D0\uC11C \uBAA8\uC758 \uC774\uBBF8\uC9C0 \uB370\uC774\uD130 \uBC18\uD658");
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
      console.log("\uC774\uBBF8\uC9C0 \uC0DD\uC131 \uC694\uCCAD \uD504\uB86C\uD504\uD2B8:", data.prompt);
      try {
        const prediction = await fetch(
          "https://api.replicate.com/v1/predictions",
          {
            method: "POST",
            headers: {
              Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              version: "black-forest-labs/flux-schnell",
              input: {
                prompt: data.prompt,
                go_fast: true,
                num_outputs: 3,
                // 3개의 이미지 생성
                aspect_ratio: "9:16",
                // 영화에 적합한 가로세로 비율
                output_format: "webp",
                output_quality: 80
              }
            })
          }
        );
        const predictionData = await prediction.json();
        console.log(
          "Replicate \uCD08\uAE30 \uC751\uB2F5:",
          JSON.stringify(predictionData).slice(0, 200) + "..."
        );
        let imageUrls = [];
        let attempts = 0;
        const maxAttempts = 15;
        while (attempts < maxAttempts) {
          attempts++;
          const checkResponse = await fetch(
            `https://api.replicate.com/v1/predictions/${predictionData.id}`,
            {
              headers: {
                Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`
              }
            }
          );
          const checkData = await checkResponse.json();
          console.log(`\uD3F4\uB9C1 \uC2DC\uB3C4 #${attempts} - \uC0C1\uD0DC: ${checkData.status}`);
          if (checkData.status === "succeeded") {
            imageUrls = checkData.output || [];
            break;
          } else if (checkData.status === "failed" || checkData.error) {
            throw new Error(
              `Replicate API \uC2E4\uD328: ${checkData.error || "Unknown error"}`
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 2e3));
        }
        if (imageUrls.length === 0) {
          if (attempts >= maxAttempts) {
            throw new Error("\uC2DC\uAC04 \uCD08\uACFC: \uC774\uBBF8\uC9C0 \uC0DD\uC131\uC774 \uB108\uBB34 \uC624\uB798 \uAC78\uB9BD\uB2C8\uB2E4");
          } else {
            throw new Error("\uC774\uBBF8\uC9C0 URL\uC744 \uBC1B\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4");
          }
        }
        console.log("\uC0DD\uC131\uB41C \uC774\uBBF8\uC9C0 URL:", imageUrls);
        if (req.user) {
          console.log("Attempting to deduct credits for image generation...");
          const newBalance = await creditsService.deductCredits(
            req.user.id,
            totalRequiredCredits,
            // 이미지 생성에 15크레딧 필요
            "Image generation (3 images)"
          );
          console.log("Image generation credit deduction result:", newBalance);
        }
        res.json({ images: imageUrls });
      } catch (replicateError) {
        console.error("Replicate API \uC624\uB958:", replicateError);
        res.status(500).json({
          success: false,
          message: "Failed to generate images: " + (replicateError.message || "Unknown error")
        });
      }
    } catch (error) {
      console.error("\uC774\uBBF8\uC9C0 \uC0DD\uC131 \uC624\uB958:", error);
      res.status(500).json({
        message: "Failed to generate images: " + (error.message || "Unknown error")
      });
    }
  });
  app2.post("/api/describe-image", async (req, res) => {
    try {
      const data = describeImageRequestSchema.parse(req.body);
      if (req.user) {
        const currentCredits = await creditsService.getUserCredits(req.user.id);
        const requiredCredits = CREDIT_COSTS.PROMPT_GENERATION;
        console.log(`\uD06C\uB808\uB527 \uD655\uC778: \uC0AC\uC6A9\uC790=${req.user.id}, \uD604\uC7AC \uD06C\uB808\uB527=${currentCredits}, \uD544\uC694 \uD06C\uB808\uB527=${requiredCredits}`);
        const hasCredits = await creditsService.hasEnoughCredits(
          req.user.id,
          requiredCredits
        );
        if (!hasCredits) {
          return res.status(402).json({
            success: false,
            message: `\uD06C\uB808\uB527\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4. \uC601\uC0C1 \uD504\uB86C\uD504\uD2B8 \uC0DD\uC131\uC744 \uC704\uD574\uC11C\uB294 ${requiredCredits}\uAC1C\uC758 \uD06C\uB808\uB527\uC774 \uD544\uC694\uD558\uC9C0\uB9CC, \uD604\uC7AC ${currentCredits}\uAC1C\uC758 \uD06C\uB808\uB527\uB9CC \uBCF4\uC720\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.`,
            requiredCredits,
            currentCredits
          });
        }
      }
      console.log("\uC601\uC0C1 \uD504\uB86C\uD504\uD2B8 \uC0DD\uC131 \uC694\uCCAD:", data.image_url);
      try {
        const n8nWebhookUrl = "https://n8n.automationpro.online/webhook/7705292a-a192-4ab1-a238-c4bafd098ee1";
        const response = await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            image_url: data.image_url
          })
        });
        if (!response.ok) {
          throw new Error(
            `API \uC751\uB2F5 \uC624\uB958: ${response.status} ${response.statusText}`
          );
        }
        const result = await response.json();
        console.log("\uC601\uC0C1 \uD504\uB86C\uD504\uD2B8 \uC0DD\uC131 \uACB0\uACFC:", result);
        if (!result.video_prompt || !result.negative_prompt) {
          throw new Error("\uC601\uC0C1 \uD504\uB86C\uD504\uD2B8 \uC0DD\uC131 \uACB0\uACFC\uAC00 \uC62C\uBC14\uB978 \uD615\uC2DD\uC774 \uC544\uB2D9\uB2C8\uB2E4");
        }
        if (req.user) {
          console.log("Attempting to deduct credits for video prompt generation...");
          const newBalance = await creditsService.deductCredits(
            req.user.id,
            CREDIT_COSTS.PROMPT_GENERATION,
            "Video prompt generation"
          );
          console.log("Video prompt generation credit deduction result:", newBalance);
        }
        res.json({
          video_prompt: result.video_prompt,
          negative_prompt: result.negative_prompt
        });
      } catch (apiError) {
        console.error("\uC601\uC0C1 \uD504\uB86C\uD504\uD2B8 \uC0DD\uC131 API \uC624\uB958:", apiError);
        const videoPrompts2 = [
          "A cinematic sequence showing the scene with dramatic lighting and atmosphere. Camera slowly moves from left to right, revealing the scene details.",
          "High-definition video capture of the scene. Camera starts with a wide establishing shot and gradually zooms in on the main subject.",
          "Atmospheric video sequence depicting the environment. Camera makes a slow vertical pan from bottom to top.",
          "Dynamic video footage with movement. Camera follows the action with smooth tracking shot."
        ];
        const negativePrompts = [
          "low quality, blurry, distorted, pixelated, low resolution, oversaturated, amateur footage, shaky camera, out of focus",
          "text overlay, watermarks, logos, timestamps, jerky movement, digital artifacts, noise, grain, dust, scratches",
          "glitchy, over-sharpened, noisy, poorly edited, bad composition, distracting elements, incorrect colors",
          "low contrast, washed out colors, poor color grading, unstable footage, excessive zoom, poor white balance"
        ];
        const randomIndex = Math.floor(Math.random() * videoPrompts2.length);
        console.log("API \uC624\uB958\uB85C \uC778\uD574 fallback \uC751\uB2F5 \uC81C\uACF5 - \uD06C\uB808\uB527 \uCC28\uAC10 \uC5C6\uC74C");
        res.json({
          video_prompt: videoPrompts2[randomIndex],
          negative_prompt: negativePrompts[randomIndex]
        });
      }
    } catch (error) {
      console.error("\uC601\uC0C1 \uD504\uB86C\uD504\uD2B8 \uC0DD\uC131 \uC694\uCCAD \uC624\uB958:", error);
      res.status(400).json({
        message: "Invalid request data: " + (error.message || "Unknown error")
      });
    }
  });
  app2.post("/api/generate-video", async (req, res) => {
    try {
      const data = generateVideoRequestSchema.parse(req.body);
      console.log("\uC601\uC0C1 \uC0DD\uC131 \uC694\uCCAD:", data);
      if (req.user) {
        const currentCredits = await creditsService.getUserCredits(req.user.id);
        const requiredCredits = CREDIT_COSTS.VIDEO_GENERATION;
        console.log(`\uD06C\uB808\uB527 \uD655\uC778: \uC0AC\uC6A9\uC790=${req.user.id}, \uD604\uC7AC \uD06C\uB808\uB527=${currentCredits}, \uD544\uC694 \uD06C\uB808\uB527=${requiredCredits}`);
        const hasCredits = await creditsService.hasEnoughCredits(
          req.user.id,
          requiredCredits
        );
        if (!hasCredits) {
          return res.status(402).json({
            success: false,
            message: `\uD06C\uB808\uB527\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4. \uC601\uC0C1 \uC0DD\uC131\uC744 \uC704\uD574\uC11C\uB294 ${requiredCredits}\uAC1C\uC758 \uD06C\uB808\uB527\uC774 \uD544\uC694\uD558\uC9C0\uB9CC, \uD604\uC7AC ${currentCredits}\uAC1C\uC758 \uD06C\uB808\uB527\uB9CC \uBCF4\uC720\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.`,
            requiredCredits,
            currentCredits
          });
        }
      }
      const isDevelopmentWithoutApiKey = process.env.NODE_ENV === "development" && !process.env.FAL_KEY;
      if (isDevelopmentWithoutApiKey) {
        console.log("\uAC1C\uBC1C \uBAA8\uB4DC\uC5D0\uC11C \uBAA8\uC758 \uC601\uC0C1 \uC0DD\uC131 \uC694\uCCAD \uCC98\uB9AC");
        const mockRequestId = "mock-req-" + Date.now();
        videoRequestCache.set(mockRequestId, {
          imageUrl: data.image_url,
          videoPrompt: data.video_prompt,
          negativePrompt: data.negative_prompt || ""
        });
        if (req.user) {
          console.log("Attempting to deduct credits for video generation...");
          const newBalance = await creditsService.deductCredits(
            req.user.id,
            CREDIT_COSTS.VIDEO_GENERATION,
            "Video generation"
          );
          console.log("Video generation credit deduction result:", newBalance);
        }
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
        const result = await fal.queue.submit("fal-ai/kling-video/v1.6/standard/image-to-video", {
          input: {
            prompt: data.video_prompt,
            image_url: data.image_url,
            aspect_ratio: "9:16",
            // 세로 영상 (모바일)
            negative_prompt: data.negative_prompt || "blur, distort, and low quality"
          }
        });
        console.log("\uC601\uC0C1 \uC0DD\uC131 \uC694\uCCAD ID:", result.request_id);
        videoRequestCache.set(result.request_id, {
          imageUrl: data.image_url,
          videoPrompt: data.video_prompt,
          negativePrompt: data.negative_prompt || ""
        });
        if (req.user) {
          console.log("Attempting to deduct credits for video generation...");
          const newBalance = await creditsService.deductCredits(
            req.user.id,
            CREDIT_COSTS.VIDEO_GENERATION,
            "Video generation"
          );
          console.log("Video generation credit deduction result:", newBalance);
        }
        res.json({
          request_id: result.request_id,
          status: "pending"
        });
      } catch (falError) {
        console.error("fal.ai API \uC624\uB958:", falError);
        res.status(500).json({
          message: "Failed to generate video: " + (falError.message || "Unknown error")
        });
      }
    } catch (error) {
      console.error("\uC601\uC0C1 \uC0DD\uC131 \uC694\uCCAD \uC624\uB958:", error);
      res.status(400).json({
        message: "Invalid request data: " + (error.message || "Unknown error")
      });
    }
  });
  app2.post("/api/check-video-status", async (req, res) => {
    try {
      const { request_id } = req.body;
      if (!request_id) {
        return res.status(400).json({
          message: "Request ID is required"
        });
      }
      const isDevelopmentWithoutApiKey = process.env.NODE_ENV === "development" && !process.env.FAL_KEY;
      if (isDevelopmentWithoutApiKey) {
        console.log("\uAC1C\uBC1C \uBAA8\uB4DC\uC5D0\uC11C \uBAA8\uC758 \uC601\uC0C1 \uC0C1\uD0DC \uC751\uB2F5");
        if (request_id.includes("mock-req")) {
          const requestData = videoRequestCache.get(request_id);
          let thumbnailUrl = "https://fal-cdn.com/default-thumbnail.jpg";
          if (requestData && requestData.imageUrl) {
            thumbnailUrl = requestData.imageUrl;
          }
          return res.json({
            status: "completed",
            video_url: "https://fal-cdn.com/v1/kl/sample-video.mp4",
            thumbnail_url: thumbnailUrl
          });
        }
        return res.json({
          status: "pending",
          progress: "Processing... (mock)"
        });
      }
      if (!process.env.FAL_KEY) {
        throw new Error("FAL_KEY is required");
      }
      try {
        const status = await fal.queue.status("fal-ai/kling-video/v1.6/standard/image-to-video", {
          requestId: request_id,
          logs: true
        });
        console.log("\uC601\uC0C1 \uC0DD\uC131 \uC0C1\uD0DC:", status.status);
        if (status.status === "COMPLETED") {
          const result = await fal.queue.result("fal-ai/kling-video/v1.6/standard/image-to-video", {
            requestId: request_id
          });
          console.log("\uC601\uC0C1 \uC0DD\uC131 \uACB0\uACFC:", JSON.stringify(result.data));
          const videoUrl = result.data.video.url;
          let thumbnailUrl = videoUrl.replace(/\.[^/.]+$/, ".jpg");
          try {
            const requestData = videoRequestCache.get(request_id);
            if (requestData && requestData.imageUrl) {
              thumbnailUrl = requestData.imageUrl;
              console.log("\uC6D0\uBCF8 \uC774\uBBF8\uC9C0\uB97C \uC378\uB124\uC77C\uB85C \uC0AC\uC6A9:", thumbnailUrl);
            } else {
              console.log("\uCE90\uC2DC\uC5D0\uC11C \uC774\uBBF8\uC9C0 URL\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC74C, \uAE30\uBCF8\uAC12 \uC0AC\uC6A9:", thumbnailUrl);
            }
          } catch (err) {
            console.warn("\uC774\uBBF8\uC9C0 URL \uC870\uD68C \uC2E4\uD328:", err);
          }
          res.json({
            status: "completed",
            video_url: videoUrl,
            thumbnail_url: thumbnailUrl
          });
        } else if (status.status === "IN_QUEUE" || status.status === "IN_PROGRESS") {
          let progressMessage = "Processing...";
          if (status.status === "IN_PROGRESS" && Array.isArray(status.logs) && status.logs.length > 0) {
            progressMessage = status.logs[status.logs.length - 1].message;
          }
          res.json({
            status: "pending",
            progress: progressMessage
          });
        } else {
          res.json({
            status: "failed",
            error: "Video generation failed"
          });
        }
      } catch (falError) {
        console.error("fal.ai \uC0C1\uD0DC \uD655\uC778 \uC624\uB958:", falError);
        res.status(500).json({
          message: "Failed to check video status: " + (falError.message || "Unknown error")
        });
      }
    } catch (error) {
      console.error("\uC601\uC0C1 \uC0C1\uD0DC \uD655\uC778 \uC694\uCCAD \uC624\uB958:", error);
      res.status(400).json({
        message: "Invalid request data: " + (error.message || "Unknown error")
      });
    }
  });
  app2.post("/api/admin/add-credits", async (req, res) => {
    try {
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
    } catch (error) {
      console.error("Add credits error:", error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  });
  app2.get("/api/credits/transactions", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const transactions = await creditsService.getTransactionHistory(req.user.id);
      res.json({ transactions });
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  });
  app2.get("/api/credits/balance", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const credits = await creditsService.getUserCredits(req.user.id);
      res.json({ credits: credits || 0 });
    } catch (error) {
      console.error("Get credit balance error:", error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  });
  app2.post("/api/auth/session-from-token", async (req, res) => {
    try {
      console.log("POST /api/auth/session-from-token - Request body:", req.body);
      console.log("Initial session ID:", req.session?.id || "No session ID");
      console.log("Environment:", process.env.NODE_ENV);
      console.log("Headers:", JSON.stringify(req.headers));
      const { access_token, refresh_token, type } = req.body;
      if (!access_token) {
        console.log("Missing access_token in request body");
        return res.status(400).json({
          success: false,
          message: "Access token is required"
        });
      }
      let userId = null;
      let email = null;
      try {
        const tokenParts = access_token.split(".");
        if (tokenParts.length !== 3) {
          console.error("Token does not have three parts:", access_token.substring(0, 20) + "...");
          throw new Error("Invalid token format");
        }
        const base64Payload = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
        const paddedBase64Payload = base64Payload.padEnd(base64Payload.length + (4 - base64Payload.length % 4) % 4, "=");
        console.log("Processing token base64 payload:", paddedBase64Payload.substring(0, 20) + "...");
        try {
          const payloadBuffer = Buffer.from(paddedBase64Payload, "base64");
          const payloadStr = payloadBuffer.toString();
          console.log("Decoded payload string (first 100 chars):", payloadStr.substring(0, 100));
          try {
            const payload = JSON.parse(payloadStr);
            console.log("Token payload parsed successfully:", payload);
            userId = payload.sub || payload.user_id || payload.id;
            email = payload.email;
            console.log("Extracted user ID from token:", userId);
            console.log("Extracted email from token:", email);
            if (!userId) {
              console.error("User ID not found in token payload");
              throw new Error("User ID not found in token");
            }
          } catch (jsonError) {
            console.error("JSON parse error:", jsonError);
            throw new Error("Failed to parse token payload JSON: " + payloadStr.substring(0, 50));
          }
        } catch (bufferError) {
          console.error("Buffer decoding error:", bufferError);
          console.error("Failed base64 payload:", paddedBase64Payload.substring(0, 50));
          throw new Error("Failed to decode token payload from base64");
        }
      } catch (tokenError) {
        console.error("Token decoding error:", tokenError);
        return res.status(400).json({
          success: false,
          message: "Invalid token format: " + (tokenError instanceof Error ? tokenError.message : String(tokenError))
        });
      }
      req.session.userId = userId;
      console.log("New session created with ID:", req.session?.id || "Unknown");
      console.log("Session user ID set to:", req.session.userId);
      if (email) {
        try {
          console.log("Checking if user exists in database...");
          const { data: existingUser, error: queryError } = await supabase.from("users").select("*").eq("id", userId).single();
          if (queryError && queryError.code !== "PGRST116") {
            console.error("Database error during user lookup:", queryError);
          }
          if (!existingUser && queryError?.code === "PGRST116") {
            console.log("User not found in database, creating new user with ID:", userId);
            try {
              const { data: newUser, error: insertError } = await supabase.from("users").insert([
                {
                  id: userId,
                  email,
                  credits: 100,
                  // 초기 크레딧
                  created_at: (/* @__PURE__ */ new Date()).toISOString(),
                  updated_at: (/* @__PURE__ */ new Date()).toISOString()
                }
              ]).select();
              if (insertError) {
                console.error("Error creating new user in database:", insertError);
                console.error("Insert error details:", {
                  code: insertError.code,
                  message: insertError.message,
                  details: insertError.details,
                  hint: insertError.hint
                });
              } else {
                console.log("Successfully created new user in database:", newUser);
              }
            } catch (insertErr) {
              console.error("Exception during user creation:", insertErr);
            }
          } else if (existingUser) {
            console.log("Found existing user in database:", existingUser.email);
          }
        } catch (dbError) {
          console.error("Database operation error:", dbError);
        }
      } else {
        console.warn("No email available from token, skipping user creation");
      }
      await new Promise((resolve, reject) => {
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
      console.log("Session created for user ID:", userId, "Session ID:", req.session?.id || "Unknown");
      const cookies = res.getHeader("Set-Cookie");
      console.log("Response cookie headers:", cookies ? JSON.stringify(cookies) : "No cookies set");
      if (!cookies || Array.isArray(cookies) && cookies.length === 0) {
        console.log("Attempting to explicitly set session cookie");
        const cookieOptions = {
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1e3,
          // 1일
          path: "/",
          sameSite: "lax",
          secure: false
        };
        res.cookie("scenario_sid", req.session.id, cookieOptions);
        const newCookies = res.getHeader("Set-Cookie");
        console.log("New cookie headers after explicit setting:", JSON.stringify(newCookies));
      }
      res.json({
        success: true,
        message: "Authentication successful",
        userId
      });
    } catch (error) {
      console.error("Session from token error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Server error"
      });
    }
  });
  const server = createServer(app2);
  return server;
}

// netlify/functions/api.ts
dotenv2.config();
var app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || "https://your-netlify-site.netlify.app",
  credentials: true
}));
app.use(cookieParser());
registerRoutes(app);
var handler = serverless(app);
export {
  handler
};
