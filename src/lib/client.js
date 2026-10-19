import { createClient } from '@supabase/supabase-js';

// Capture recovery intent before Auth consumes and removes tokens from the URL.
const initialUrl = new URL(window.location.href);
const initialHash = new URLSearchParams(initialUrl.hash.slice(1));
export const recoveryContext = {
  requested: initialUrl.searchParams.get('auth') === 'recovery' || initialHash.get('type') === 'recovery',
  fromLink: (initialHash.get('type') === 'recovery' && initialHash.has('access_token')) ||
    (initialUrl.searchParams.get('auth') === 'recovery' && initialUrl.searchParams.has('code')),
  userId: null,
};

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
    // Register before initialization finishes, including recovery links opened in a fresh tab.
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') recoveryContext.userId = session?.user.id || null;
      if (event === 'SIGNED_OUT') recoveryContext.userId = null;
    });
  } catch {
    configured = false;
    configurationError = 'Your Supabase URL or key is invalid. Check .env and restart the development server.';
  }
}
