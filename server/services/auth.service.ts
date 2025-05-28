import { supabase } from '../supabase';

/**
 * Service for handling user authentication
 */
export class AuthService {
  // 최근 전송된 매직 링크 요청을 추적하는 메모리 캐시
  private recentMagicLinkRequests = new Map<string, number>();
  
  /**
   * Send a magic link to the user's email
   * @param email The user's email address
   * @returns Result of the magic link operation
   */
  async sendMagicLink(email: string) {
    try {
      console.log(`Attempting to send magic link to: ${email}`);
      
      // 중복 요청 방지: 동일 이메일에 대해 30초 내에 반복 요청 제한
      const now = Date.now();
      const lastRequestTime = this.recentMagicLinkRequests.get(email);
      
      if (lastRequestTime && (now - lastRequestTime < 30000)) {
        console.log(`Rate limiting magic link for ${email} - last request was ${(now - lastRequestTime) / 1000} seconds ago`);
        return { 
          success: true, 
          data: { rateLimited: true },
          message: "Magic link was recently sent. Please wait before requesting another one."
        };
      }
      
      // 요청 시간 기록
      this.recentMagicLinkRequests.set(email, now);
      
      // 5분 후 캐시에서 해당 이메일 제거 (메모리 관리)
      setTimeout(() => {
        this.recentMagicLinkRequests.delete(email);
      }, 5 * 60 * 1000);
      
      // Supabase를 통해 이메일 전송 시도
      try {
        console.log('Calling Supabase auth.signInWithOtp for email:', email);
        
        const { data, error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${process.env.APP_URL || 'http://localhost:3000'}/auth/callback`,
          },
        });

        if (error) {
          console.error('Supabase error sending magic link:', error);
          throw error;
        }

        console.log('Successfully sent magic link via Supabase to:', email);
        
        // 개발 모드에서 이메일 로그 추가
        if (process.env.NODE_ENV === 'development') {
          console.log('====================================');
          console.log('DEVELOPMENT MODE: Magic Link Email was ACTUALLY SENT');
          console.log('------------------------------------');
          console.log(`Email address: ${email}`);
          console.log(`Check your email for the login link`);
          console.log('====================================');
        }
        
        return { success: true, data };
      } catch (supabaseError) {
        console.error('Exception calling Supabase auth.signInWithOtp:', supabaseError);
        throw supabaseError;
      }
    } catch (error) {
      console.error('Failed to send magic link:', error);
      return { success: false, error };
    }
  }

  /**
   * Get user by their ID
   * @param userId User ID
   * @returns User data or null if not found
   */
  async getUserById(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  /**
   * Get user by their email
   * @param email User email
   * @returns User data or null if not found
   */
  async getUserByEmail(email: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        console.error('Error fetching user by email:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get user by email:', error);
      return null;
    }
  }

  /**
   * Create a new user in the database
   * @param userData User data to create
   * @returns Created user data
   */
  async createUser(userData: { id: string; email: string }) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([
          { 
            id: userData.id, 
            email: userData.email,
            credits: 100, // Give new users 100 free credits
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }
} 