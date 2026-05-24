import { defineMiddleware } from 'astro:middleware';
import { createServerClient } from '@/lib/supabase';

const protectedRoutes = ['/setup', '/upload', '/processing', '/preview'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect } = context;
  const pathname = url.pathname;

  // ── Intercept OAuth codes that land on the wrong page ──────────────
  // When Supabase falls back to site_url (e.g. ngrok not in allowlist),
  // the ?code= param arrives on "/" instead of "/api/auth/callback".
  // Forward it to the proper callback endpoint.
  const code = url.searchParams.get('code');
  if (code && pathname !== '/api/auth/callback') {
    const callbackUrl = new URL('/api/auth/callback', url.origin);
    callbackUrl.searchParams.set('code', code);
    return redirect(callbackUrl.toString(), 302);
  }

  // ── Protect authenticated routes ───────────────────────────────────
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    const supabase = createServerClient(cookies);
    const { data: { user } } = await supabase.auth.getUser();

    // If there is no user session, redirect to the register page
    if (!user) {
      return redirect('/register');
    }
  }

  // If it's not a protected route, or the user is authenticated, continue
  return next();
});
