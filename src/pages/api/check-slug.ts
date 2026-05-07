export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
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

  // TODO: Once Supabase is configured, check against the `stores` table:
  // const supabase = createServerClient(cookies);
  // const { data } = await supabase.from('stores').select('id').eq('slug', slug).maybeSingle();
  // return new Response(JSON.stringify({ available: !data }), { ... });

  // For now, return available: true (no DB connected yet)
  return new Response(JSON.stringify({ available: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
