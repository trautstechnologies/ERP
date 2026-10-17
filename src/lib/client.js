import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export let configured = Boolean(url && key && !url.includes('YOUR_PROJECT') && !key.includes('YOUR_PUBLIC'));
export let configurationError = '';
export let supabase = null;
if (configured) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid protocol');
    supabase = createClient(url, key);
  } catch {
    configured = false;
    configurationError = 'Your Supabase URL or key is invalid. Check .env and restart the development server.';
  }
}
