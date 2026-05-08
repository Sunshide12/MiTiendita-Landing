import { createServerClient as createSupabaseServerClient, createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
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
        get(key: string) {
          return cookies.get(key)?.value;
        },
        set(key: string, value: string, options: any) {
          cookies.set(key, value, { path: '/', ...options });
        },
        remove(key: string, options: any) {
          cookies.delete(key, { path: '/', ...options });
        },
      },
    }
  );
}

/**
 * Creates a Supabase client for the browser (client-side islands).
 * Uses cookies to sync the session with the server.
 */
export function createBrowserClient() {
  return createSupabaseBrowserClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  );
}
