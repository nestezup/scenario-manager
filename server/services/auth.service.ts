import { supabase } from '../supabase';

/**
 * Service for handling user authentication
 */
export class AuthService {
  /**
   * Send a magic link to the user's email
   * @param email The user's email address
   * @returns Result of the magic link operation
   */
  async sendMagicLink(email: string) {
    try {
      console.log(`Attempting to send magic link to: ${email}`);
      
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
          
          // 개발 모드에서는 오류가 발생해도 성공으로 처리하고 임시 링크 제공
          if (process.env.NODE_ENV === 'development') {
            console.log('====================================');
            console.log('DEVELOPMENT MODE: Magic Link Email');
            console.log('------------------------------------');
            console.log(`Email address: ${email}`);
            console.log(`Login link: ${process.env.APP_URL || 'http://localhost:3000'}/auth/callback?code=mock-auth-code`);
            console.log('====================================');
            
            console.warn('Development mode: Using mock data due to Supabase error');
            return { success: true, data: { user: { email } } };
          }
          
          throw error;
        }

        console.log('Successfully sent magic link via Supabase to:', email);
        
        // 개발 모드에서 이메일 로그 추가
        if (process.env.NODE_ENV === 'development') {
          console.log('====================================');
          console.log('DEVELOPMENT MODE: Magic Link Email was ACTUALLY SENT');
          console.log('------------------------------------');
          console.log(`Email address: ${email}`);
          console.log(`Check your email for the login link or use:`);
          console.log(`${process.env.APP_URL || 'http://localhost:3000'}/auth/callback?code=mock-auth-code`);
          console.log('====================================');
        }
        
        return { success: true, data };
      } catch (supabaseError) {
        console.error('Exception calling Supabase auth.signInWithOtp:', supabaseError);
        
        // 개발 모드에서는 예외가 발생해도 성공으로 처리하고 임시 링크 제공
        if (process.env.NODE_ENV === 'development') {
          console.log('====================================');
          console.log('DEVELOPMENT MODE: Magic Link Email (Mock due to error)');
          console.log('------------------------------------');
          console.log(`Email address: ${email}`);
          console.log(`Login link: ${process.env.APP_URL || 'http://localhost:3000'}/auth/callback?code=mock-auth-code`);
          console.log('====================================');
          
          console.warn('Development mode: Using mock data due to Supabase exception');
          return { success: true, data: { user: { email } } };
        }
        
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
            credits: 10, // Give new users 10 free credits
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