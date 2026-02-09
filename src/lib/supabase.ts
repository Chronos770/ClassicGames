import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qjjfrblhnvfmrlpujbzx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqamZyYmxobnZmbXJscHVqYnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NjI5NzksImV4cCI6MjA4NjIzODk3OX0.5MBpP52LRgPO-ylwUBMR-mi8O8KL--Mwqsdd7Z6wj-E';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
