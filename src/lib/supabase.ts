import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

/**
 * Creates a Supabase client for SSR routes (server-side).
 * Uses Astro's cookie API to manage the auth session.
 */
export function createServerClient(cookies: AstroCookies) {
  return createSupabaseServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          // AstroCookies doesn't expose a getAll() method.
          // Return empty array — @supabase/ssr handles cookie
          // lifecycle via setAll on auth interactions.
          return [] as { name: string; value: string }[];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set(name, value, {
              path: '/',
              ...options,
            });
          });
        },
      },
    }
  );
}

/**
 * Creates a Supabase client for the browser (client-side islands).
 * Does NOT use cookies — relies on localStorage for the session.
 */
export function createBrowserClient() {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  );
}
