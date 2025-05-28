import express, { type Request, Response, NextFunction } from "express";
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables first, before any other imports
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Now other imports
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from 'express-session';
import { supabase } from './supabase';

// Debug logs for environment variables
console.log("===== ENVIRONMENT VARIABLES DEBUG =====");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("SUPABASE_URL:", process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 10) + "..." : "NOT LOADED");
console.log("SUPABASE_SERVICE_KEY:", process.env.SUPABASE_SERVICE_KEY ? "LOADED (starts with: " + process.env.SUPABASE_SERVICE_KEY.substring(0, 5) + "...)" : "NOT LOADED");
console.log("REPLICATE_API_TOKEN:", process.env.REPLICATE_API_TOKEN ? "LOADED" : "NOT LOADED");
console.log("FAL_KEY:", process.env.FAL_KEY ? "LOADED" : "NOT LOADED");
console.log("=======================================");

// Extend express session with our custom properties
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup session middleware with improved settings
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'scenario-manager-secret-key',
  resave: false,
  saveUninitialized: false, // Only save sessions when they are modified
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    httpOnly: true
  }
};

// Add additional logging for session setup
console.log("Session configuration:", {
  secret: sessionConfig.secret ? `${sessionConfig.secret.substring(0, 5)}...` : 'NOT SET',
  resave: sessionConfig.resave,
  saveUninitialized: sessionConfig.saveUninitialized,
  cookie: {
    secure: sessionConfig.cookie.secure,
    maxAge: sessionConfig.cookie.maxAge
  }
});

app.use(session(sessionConfig));

// Add session debugging middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Request ${req.method} ${req.path} - Session ID: ${req.session.id}`);
    if (req.session.userId) {
      console.log(`Authenticated as userId: ${req.session.userId}`);
    }
  }
  next();
});

// Only apply auth middleware to API routes to avoid conflicts with client-side routing
app.use('/api', async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  // Skip auth check for public routes
  if (req.path === '/login' || 
      req.path === '/signup' ||
      req.path === '/magic-link' ||
      req.path === '/auth/session-from-token') {
    return next();
  }

  // Check if we're using mock auth in development mode
  const isDevelopmentWithoutSupabase = 
    process.env.NODE_ENV === 'development' && 
    (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY);

  // If in development mode without Supabase, use mock auth
  if (isDevelopmentWithoutSupabase && req.path === '/me') {
    console.log("Using mock authentication for /api/me");
    // Return mock user data
    req.user = { 
      id: 'mock-user-id', 
      email: 'mock@example.com',
      credits: 100 
    };
    return next();
  }

  // Check if session has user data
  const userId = req.session.userId;
  if (!userId) {
    console.log("Auth middleware - No userId found in session");
    return res.status(401).json({ message: "Not authenticated" });
  }

  console.log(`Auth middleware - Checking user with ID: ${userId}`);

  // Get user data from Supabase
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Auth middleware - Supabase error:', error);
      // Clear invalid session
      req.session.destroy(() => {
        res.status(401).json({ message: "Invalid session - Database error" });
      });
      return;
    }

    if (!user) {
      console.error('Auth middleware - User not found in database:', userId);
      
      // 사용자가 없으면 새로 생성 (자동 사용자 등록)
      console.log("Auto-creating user:", userId);
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([
          { 
            id: userId, 
            email: `user-${userId.substring(0, 8)}@example.com`, // 임시 이메일 생성
            credits: 100, // 초기 크레딧
            created_at: new Date().toISOString()
          }
        ])
        .select();
      
      if (insertError) {
        console.error('Auth middleware - Failed to create user:', insertError);
      } else if (newUser) {
        console.log('Auth middleware - Created missing user:', newUser);
        req.user = newUser;
        return next();
      }
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: "Server error" });
  }
});

// Setup explicit callback route for auth
app.get("/auth/callback", async (req, res, next) => {
  console.log("AUTH CALLBACK - Full URL:", req.url);
  console.log("AUTH CALLBACK - Query params:", req.query);
  
  const { code } = req.query;
  
  console.log('AUTH CALLBACK - Received code:', code);
  
  if (!code || typeof code !== 'string') {
    console.error('AUTH CALLBACK - Invalid or missing code in query parameters');
    
    // 클라이언트 측 처리를 위해 해시가 포함된 URL로 리디렉션
    if (req.url.includes('#')) {
      console.log('AUTH CALLBACK - URL contains hash, redirecting to client-side handler');
      return res.redirect('/auth/callback');
    }
    
    return res.redirect('/auth/login?error=invalid_code');
  }
  
  // 개발 모드에서 모의 인증 코드 처리
  if (process.env.NODE_ENV === 'development' && code === 'mock-auth-code') {
    console.log("Processing mock auth code in development mode");
    
    // 모의 사용자 ID 설정
    req.session.userId = 'mock-user-id';

    // 세션이 저장될 때까지 기다림
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error("Failed to save session:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    console.log('개발 모드에서 세션 설정 완료. userId:', req.session.userId);
    return res.redirect('/');
  }
  
  try {
    console.log('Calling supabase.auth.exchangeCodeForSession with code length:', code.length);
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error("Auth callback error:", error);
      return res.redirect('/auth/login?error=auth_failed&reason=' + encodeURIComponent(error.message || 'unknown'));
    }
    
    if (!data || !data.user) {
      console.error("Auth callback - No user data returned");
      return res.redirect('/auth/login?error=no_user_data');
    }
    
    console.log("Auth successful for user:", data.user.email);
    
    // Set user ID in session
    req.session.userId = data.user.id;
    
    // Ensure session is saved before redirecting
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error("Failed to save session:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    console.log("Session saved with userId:", req.session.userId);
    
    // Redirect to dashboard
    res.redirect('/');
  } catch (error) {
    console.error("Auth callback processing error:", error);
    res.redirect('/auth/login?error=server_error');
  }
});

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register API routes first
  const server = await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error(err);
  });

  // Setup Vite or static files after all API routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start the server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    log(`Server running on port ${PORT}`);
  });
})();
