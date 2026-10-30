import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://sddpseuzbpnsmemxlemn.supabase.co'
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(anonKey)
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null