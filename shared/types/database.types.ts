export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
          credits: number
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
          credits?: number
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
          credits?: number
        }
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          transaction_type: string
          created_at: string
          description: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          transaction_type: string
          created_at?: string
          description: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          transaction_type?: string
          created_at?: string
          description?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      transaction_type: 'debit' | 'credit'
    }
  }
} 