import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createServerClient(cookies);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return redirect('/setup');
    }

    console.error('Auth callback error:', error.message);
  }

  // If there's an error or no code, redirect back to register
  return redirect('/register');
};
