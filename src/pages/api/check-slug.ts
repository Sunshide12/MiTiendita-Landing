export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

export const GET: APIRoute = async ({ request, cookies }) => {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug')?.toLowerCase().trim();

  // Validate slug format: 3-30 chars, only lowercase letters, numbers, and hyphens
  if (!slug || !/^[a-z0-9-]{3,30}$/.test(slug)) {
    return new Response(
      JSON.stringify({ available: false, reason: 'formato-invalido' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const supabase = createServerClient(cookies);
  const { data } = await supabase.from('stores').select('id').eq('slug', slug).maybeSingle();

  return new Response(JSON.stringify({ available: !data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
