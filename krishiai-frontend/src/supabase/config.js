import { createClient } from '@supabase/supabase-js';

// Your Supabase project configuration
// These values should be replaced with your actual Supabase project configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
