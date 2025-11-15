// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// This will be used once Supabase is properly configured
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return supabaseUrl !== '' &&
         supabaseAnonKey !== '' &&
         supabaseUrl !== 'your_supabase_url_here' &&
         supabaseAnonKey !== 'your_supabase_anon_key_here'
}
