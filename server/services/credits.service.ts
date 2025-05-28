import { supabase } from '../supabase';

/**
 * Service for handling user credits
 */
export class CreditsService {
  /**
   * Get the current credit balance for a user
   * @param userId User ID
   * @returns Current credit balance or null if error
   */
  async getUserCredits(userId: string): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user credits:', error);
        return null;
      }

      return data?.credits || 0;
    } catch (error) {
      console.error('Failed to get user credits:', error);
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
  async addCredits(userId: string, amount: number, description: string): Promise<number | null> {
    try {
      // Start a transaction
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user for credit addition:', userError);
        return null;
      }

      const currentCredits = user?.credits || 0;
      const newCredits = currentCredits + amount;

      // Update user credits
      const { error: updateError } = await supabase
        .from('users')
        .update({ credits: newCredits, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user credits:', updateError);
        return null;
      }

      // Record the transaction
      const { error: transactionError } = await supabase
        .from('credits_transactions')
        .insert([
          {
            user_id: userId,
            amount,
            transaction_type: 'credit',
            description,
            created_at: new Date().toISOString()
          }
        ]);

      if (transactionError) {
        console.error('Error recording credit transaction:', transactionError);
        // We don't want to fail the entire operation if just the transaction recording fails
      }

      return newCredits;
    } catch (error) {
      console.error('Failed to add credits:', error);
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
  async deductCredits(userId: string, amount: number, description: string): Promise<number | null> {
    try {
      // Start a transaction
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user for credit deduction:', userError);
        return null;
      }

      const currentCredits = user?.credits || 0;
      
      // Check if user has enough credits
      if (currentCredits < amount) {
        console.error('Insufficient credits:', { userId, currentCredits, requiredAmount: amount });
        return null;
      }
      
      const newCredits = currentCredits - amount;

      // Update user credits
      const { error: updateError } = await supabase
        .from('users')
        .update({ credits: newCredits, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user credits:', updateError);
        return null;
      }

      // Record the transaction
      const { error: transactionError } = await supabase
        .from('credits_transactions')
        .insert([
          {
            user_id: userId,
            amount,
            transaction_type: 'debit',
            description,
            created_at: new Date().toISOString()
          }
        ]);

      if (transactionError) {
        console.error('Error recording debit transaction:', transactionError);
        // We don't want to fail the entire operation if just the transaction recording fails
      }

      return newCredits;
    } catch (error) {
      console.error('Failed to deduct credits:', error);
      return null;
    }
  }

  /**
   * Check if user has enough credits for an operation
   * @param userId User ID
   * @param requiredAmount Amount of credits required
   * @returns Boolean indicating if user has enough credits
   */
  async hasEnoughCredits(userId: string, requiredAmount: number): Promise<boolean> {
    const credits = await this.getUserCredits(userId);
    return credits !== null && credits >= requiredAmount;
  }

  /**
   * Get transaction history for a user
   * @param userId User ID
   * @returns Array of transaction records
   */
  async getTransactionHistory(userId: string) {
    try {
      const { data, error } = await supabase
        .from('credits_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transaction history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  }
} 