import { createClient } from '@supabase/supabase-js';
import type { Database } from '../shared/types/database.types';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Try to read .env file directly to ensure environment variables are loaded
let supabaseUrl = process.env.SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// If environment variables are not set, try to read them from .env file directly
if (!supabaseUrl || !supabaseKey) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      console.log('Reading .env file directly from:', envPath);
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      
      // Set variables from file
      supabaseUrl = envConfig.SUPABASE_URL;
      supabaseKey = envConfig.SUPABASE_SERVICE_KEY;
      
      console.log('Loaded Supabase credentials directly from .env file');
    }
  } catch (error) {
    console.error('Error reading .env file:', error);
  }
}

// Debug logs for Supabase configuration
console.log("===== SUPABASE CONFIGURATION DEBUG =====");
console.log("SUPABASE_URL:", supabaseUrl ? supabaseUrl : "NOT SET");
console.log("SUPABASE_SERVICE_KEY:", supabaseKey ? `LOADED (length: ${supabaseKey.length})` : "NOT SET");
console.log("URL and KEY are both set:", Boolean(supabaseUrl && supabaseKey));
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("=========================================");

// Check if we're in development mode without Supabase credentials
const isDevelopmentWithoutSupabase = 
  false; // 항상 실제 Supabase 클라이언트를 사용하도록 변경

console.log("Using mock Supabase client:", isDevelopmentWithoutSupabase);

if (isDevelopmentWithoutSupabase) {
  console.warn('Running in development mode without Supabase credentials. Authentication and database features will be mocked.');
} else if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
} else {
  console.log('Using real Supabase client with provided credentials');
}

// Create a mock client for development without credentials
const createMockClient = () => {
  return {
    auth: {
      signInWithOtp: async ({ email }: { email: string }) => {
        console.log(`[MOCK] Sending magic link to ${email}`);
        return { 
          data: { user: { email } },
          error: null 
        };
      },
      exchangeCodeForSession: async (code: string) => {
        console.log(`[MOCK] Exchanging code for session: ${code}`);
        return { 
          data: { 
            user: { id: 'mock-user-id', email: 'mock@example.com' } 
          }, 
          error: null 
        };
      },
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ 
            data: table === 'users' 
              ? { id: 'mock-user-id', email: 'mock@example.com', credits: 100 } 
              : {}, 
            error: null 
          }),
          order: () => ({
            data: table === 'credit_transactions' 
              ? [{ 
                  id: 'mock-tx-1', 
                  amount: 10, 
                  transaction_type: 'credit', 
                  created_at: new Date().toISOString(), 
                  description: 'Initial credits' 
                }] 
              : [], 
            error: null 
          })
        })
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ 
            data: { id: 'new-record-id' }, 
            error: null 
          })
        })
      }),
      update: () => ({
        eq: async () => ({ data: {}, error: null })
      })
    })
  } as any;
};

// Use real client if credentials are available, otherwise use mock
let supabaseClient;

try {
  if (!isDevelopmentWithoutSupabase && supabaseUrl && supabaseKey) {
    console.log("Creating Supabase client with URL:", supabaseUrl);
    console.log("Service Key starts with:", supabaseKey.substring(0, 10) + "...");
    
    // Check if URL is valid
    try {
      new URL(supabaseUrl);
    } catch (e) {
      console.error("Invalid Supabase URL format:", e);
    }
    
    // Create client with more detailed options
    supabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    
    // Test the client - wrap in immediate function instead of using top-level await
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
    
    console.log('Successfully created real Supabase client');
  } else {
    supabaseClient = createMockClient();
    console.log('Using mock Supabase client');
  }
} catch (error) {
  console.error('Error creating Supabase client:', error);
  supabaseClient = createMockClient();
  console.log('Falling back to mock Supabase client due to error');
}

export const supabase = supabaseClient; 