import express, { type Request, Response, NextFunction } from "express";
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';

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

// CORS 설정 추가
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    // Allow any localhost port and the configured APP_URL
    if (origin.match(/^https?:\/\/localhost:[0-9]+$/) || 
        origin === process.env.APP_URL) {
      return callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true, // 중요: 쿠키 전송을 허용
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Cookie parser 추가
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup session middleware with improved settings
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'scenario-manager-secret-key',
  resave: true, // 모든 요청에서 세션을 다시 저장하도록 변경
  saveUninitialized: true, // 초기화되지 않은 세션도 저장
  name: 'scenario_sid', // 세션 쿠키 이름 변경
  cookie: { 
    secure: false, // 개발 환경에서는 false로 설정
    sameSite: 'lax' as const, // 타입 캐스팅 추가
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    httpOnly: true,
    path: '/'
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
    // 기본 요청 정보 로깅
    console.log(`Request ${req.method} ${req.path} - Session ID: ${req.session?.id || 'No session'}`);
    
    // 세션에 사용자 ID가 있으면 로깅
    if (req.session?.userId) {
      console.log(`Authenticated as userId: ${req.session.userId}`);
    }
    
    // 인증 관련 엔드포인트나 API 요청에 대해 더 자세한 정보 로깅
    if (req.path.includes('/auth/') || req.path === '/api/me') {
      console.log('Session details:', {
        id: req.session?.id,
        userId: req.session?.userId,
        cookie: req.session?.cookie
      });
      
      // 쿠키 헤더 확인
      console.log('Cookie header:', req.headers.cookie);
    }
    
    // 응답이 완료된 후 세션 상태 확인 (res.on 사용)
    if (req.path.includes('/auth/') || req.path === '/api/me') {
      res.on('finish', () => {
        // req.session이 undefined일 수 있으므로 안전하게 처리
        if (req.session) {
          console.log('Response finished - Session after response:', {
            id: req.session.id,
            userId: req.session.userId
          });
        } else {
          console.log('Response finished - Session is undefined after response');
        }
      });
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
      req.path === '/auth/session-from-token' ||
      req.path === '/me') {  // /api/me는 자체적으로 인증을 처리하므로 제외
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
    // 먼저 사용자가 존재하는지 확인
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 사용자를 찾을 수 없음 (not found) - 자동 생성 시도
        console.log('Auth middleware - User not found in database, attempting to create:', userId);
        
        try {
          // 사용자 자동 생성
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([
              { 
                id: userId, 
                email: `user-${userId.substring(0, 8)}@example.com`, // 임시 이메일 생성
                credits: 100, // 초기 크레딧
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ])
            .select();
          
          if (insertError) {
            console.error('Auth middleware - Failed to create user:', insertError);
            // 세션 클리어 및 인증 실패 응답
            req.session.destroy(() => {
              res.status(401).json({ message: "Invalid session - User creation failed" });
            });
            return;
          }
          
          if (!newUser || newUser.length === 0) {
            console.error('Auth middleware - User creation returned no data');
            req.session.destroy(() => {
              res.status(401).json({ message: "Invalid session - User creation failed" });
            });
            return;
          }
          
          console.log('Auth middleware - Successfully created user:', newUser[0]);
          req.user = newUser[0];
          return next();
        } catch (createError) {
          console.error('Auth middleware - Exception during user creation:', createError);
          req.session.destroy(() => {
            res.status(401).json({ message: "Invalid session - User creation failed" });
          });
          return;
        }
      } else {
        // 다른 데이터베이스 오류
        console.error('Auth middleware - Supabase error:', error);
        // Clear invalid session
        req.session.destroy(() => {
          res.status(401).json({ message: "Invalid session - Database error" });
        });
        return;
      }
    }

    if (!user) {
      console.error('Auth middleware - User lookup returned empty result for ID:', userId);
      req.session.destroy(() => {
        res.status(401).json({ message: "Invalid session - User not found" });
      });
      return;
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
  console.log("AUTH CALLBACK - Headers:", req.headers);
  console.log("AUTH CALLBACK - Referrer:", req.headers.referer || 'Not provided');
  
  const { code } = req.query;
  
  console.log('AUTH CALLBACK - Received code:', code);
  
  if (!code || typeof code !== 'string') {
    console.error('AUTH CALLBACK - Invalid or missing code in query parameters');
    
    // 모든 쿼리 파라미터 로깅
    console.log('AUTH CALLBACK - All query params:', Object.keys(req.query).map(key => `${key}: ${req.query[key]}`));
    
    // 코드가 없으면 클라이언트 측에서 해시 토큰을 처리하도록 HTML 페이지 반환
    console.log('AUTH CALLBACK - No code found, serving client-side auth handler');
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication</title>
        <script>
          // 해시에서 토큰 추출
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');
          
          console.log('Client-side auth handler - Hash params:', { 
            accessToken: accessToken ? 'Present' : 'Not found',
            refreshToken: refreshToken ? 'Present' : 'Not found',
            type 
          });
          
          if (accessToken) {
            // 토큰을 서버에 전달하여 세션 설정
            fetch('/api/auth/session-from-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                access_token: accessToken,
                refresh_token: refreshToken,
                type: type
              }),
              credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
              console.log('Session creation response:', data);
              if (data.success) {
                // 인증 성공, 홈으로 리디렉션
                window.location.href = '/';
              } else {
                // 인증 실패
                window.location.href = '/auth/login?error=auth_failed';
              }
            })
            .catch(error => {
              console.error('Authentication error:', error);
              window.location.href = '/auth/login?error=auth_failed';
            });
          } else {
            // 토큰이 없으면 로그인 페이지로 리디렉션
            console.error('No access token found in URL hash');
            window.location.href = '/auth/login?error=invalid_token';
          }
        </script>
      </head>
      <body>
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
          <div style="text-align: center;">
            <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 0 auto 20px;"></div>
            <p>Authenticating...</p>
          </div>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </body>
      </html>
    `);
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
    
    // Ensure session is saved before checking user in database
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error("Failed to save session:", err);
          reject(err);
        } else {
          console.log("Session saved with userId:", req.session.userId);
          resolve();
        }
      });
    });
    
    try {
      // 사용자가 데이터베이스에 존재하는지 확인
      console.log('Checking if user exists in database...');
      const { data: existingUser, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      if (queryError) {
        console.error('Error querying user from database:', queryError);
        // 오류가 발생했지만 인증은 계속 진행
      }
      
      // 사용자가 존재하지 않으면 새로 생성
      if (!existingUser && queryError?.code === 'PGRST116') {
        console.log('User not found in database, creating new user with ID:', data.user.id);
        
        try {
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([
              { 
                id: data.user.id, 
                email: data.user.email,
                credits: 100, // 초기 크레딧
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ])
            .select();
            
          if (insertError) {
            console.error('Error creating new user in database:', insertError);
            // 사용자 생성에 실패했지만 인증은 계속 진행
          } else {
            console.log('Successfully created new user:', newUser);
          }
        } catch (createError) {
          console.error('Exception during user creation:', createError);
          // 예외가 발생했지만 인증은 계속 진행
        }
      } else if (existingUser) {
        console.log('Found existing user in database:', existingUser.email);
      }
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      // DB 작업 오류가 발생했지만 인증은 계속 진행
    }
    
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
        try {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } catch (err) {
          logLine += ` :: [Error serializing response]`;
        }
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

  // Start the server with port fallback mechanism
  const startServer = (port: number) => {
    return new Promise<void>((resolve, reject) => {
      server.listen(port)
        .on('listening', () => {
          log(`Server running on port ${port}`);
          resolve();
        })
        .on('error', (err: NodeJS.ErrnoException) => {
          // If port is already in use, try the next port
          if (err.code === 'EADDRINUSE') {
            log(`Port ${port} is busy, trying port ${port + 1}...`);
            server.close();
            resolve(startServer(port + 1));
          } else {
            reject(err);
          }
        });
    });
  };

  try {
    const initialPort = parseInt(process.env.PORT || "3000", 10);
    await startServer(initialPort);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
