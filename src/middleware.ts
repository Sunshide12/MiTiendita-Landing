import { defineMiddleware } from 'astro:middleware';
import { createServerClient } from '@/lib/supabase';

const protectedRoutes = ['/setup', '/upload', '/processing', '/preview'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect } = context;
  const pathname = url.pathname;

  // Check if the current route is one of the protected routes
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
