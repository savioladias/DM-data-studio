import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// Use this for client-side operations (storage uploads, etc.)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
