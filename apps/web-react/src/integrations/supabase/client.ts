import { createClient } from '@supabase/supabase-js';

// Anon-key browser client only. Privileged work goes through Edge Functions.
// Falls back to placeholders (with a warning) so the UI still renders without
// env configured; only network calls fail. Never throw at import time.
const url = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn('[eshule] VITE_SUPABASE_URL not set — using placeholder. Copy .env.example to .env.');
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
