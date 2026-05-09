import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import OpenAI from "https://esm.sh/openai@4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── AI Clients ───────────────────────────────────────────────────────────────

function buildClients() {
  const gemini = new OpenAI({
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: Deno.env.get('GEMINI_API_KEY')!,
  })

  const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: Deno.env.get('OPENROUTER_API_KEY') ?? 'no-key',
    defaultHeaders: {
      'HTTP-Referer': 'https://mitienda.com',
      'X-Title': 'MiTienda SaaS',
    },
  })

  return { gemini, openrouter }
}

// Priority list — starts with cheapest/fastest, falls back on rate limit
function buildModelList(clients: ReturnType<typeof buildClients>) {
  return [
    { client: clients.gemini,     model: 'gemini-2.0-flash',               name: 'Gemini 2.0 Flash' },
    { client: clients.gemini,     model: 'gemini-2.0-flash-lite',           name: 'Gemini 2.0 Flash Lite' },
    { client: clients.openrouter, model: 'google/gemma-4-31b-it:free',      name: 'Gemma 4 31B' },
    { client: clients.openrouter, model: 'google/gemma-4-26b-a4b-it:free',  name: 'Gemma 4 26B' },
    { client: clients.openrouter, model: 'google/gemma-3-27b-it:free',      name: 'Gemma 3 27B' },
  ]
}

const PROMPT = `Eres un experto en e-commerce y copywriting. Analiza la imagen de este producto y devuelve ÚNICAMENTE un JSON válido con esta estructura exacta (sin texto adicional, sin markdown, sin comillas extras):

{
  "nombre": "Nombre comercial del producto",
  "marca": "Marca FABRICANTE del producto (ej: Apple, Samsung, Sony). NO confundir con el nombre del vendedor o tienda",
  "modelo": "Modelo o versión específica",
  "precio": null,
  "descripcion": "Frase comercial corta y atractiva de máximo 2 líneas. NO copies el texto de la imagen. Crea una descripción que destaque el beneficio principal y genere deseo de compra."
}

REGLAS IMPORTANTES:
- "marca" = quien FABRICA el producto, no quien lo vende
- "descripcion" = redacción propia, comercial y persuasiva, máximo 150 caracteres
- Si no puedes determinar un dato con certeza, usa null
- Responde SOLO con el JSON, sin explicaciones`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRateLimit(error: unknown): boolean {
  const msg = String(error).toLowerCase()
  return (
    msg.includes('rate limit') ||
    msg.includes('429') ||
    msg.includes('per-day') ||
    msg.includes('per-minute') ||
    msg.includes('quota')
  )
}

function parseJSON(raw: string): object {
  // Strip markdown code fences AI models sometimes add
  const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim()
  return JSON.parse(clean)
}

// Download image from R2 and convert to base64
async function fetchImageAsBase64(r2Path: string): Promise<{ base64: string; mimeType: string }> {
  const r2PublicUrl = Deno.env.get('R2_PUBLIC_URL')!
  const url = `${r2PublicUrl}/${r2Path}`
  console.log(`[AI Function] Descargando imagen desde: ${url}`)

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`No se pudo descargar la imagen ${r2Path}: HTTP ${res.status}`)
  }

  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const mimeType = contentType.split(';')[0]
  const arrayBuffer = await res.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
  return { base64, mimeType }
}

// Core AI extraction with sequential fallback
async function extractProductData(base64Image: string, mimeType: string): Promise<object> {
  const clients = buildClients()
  const models = buildModelList(clients)
  let lastError: unknown

  for (const { client, model, name } of models) {
    console.log(`[AI Function] Intentando con modelo: ${name}`)
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64Image}` },
              },
            ],
          },
        ],
      })

      const raw = response.choices[0].message.content ?? '{}'
      const result = parseJSON(raw)
      console.log(`[AI Function] ✅ Éxito con: ${name}`, result)
      return result
    } catch (error) {
      if (isRateLimit(error)) {
        console.warn(`[AI Function] ⚠️ Rate limit en ${name}, probando siguiente...`)
        lastError = error
        continue
      }
      console.error(`[AI Function] ❌ Error no recuperable con ${name}:`, error)
      throw error
    }
  }

  console.error('[AI Function] ❌ Todos los modelos alcanzaron su límite.')
  throw lastError
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  // Build Supabase admin client (service role bypasses RLS for writes)
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let jobId: string | null = null

  try {
    const { storeId, r2Paths } = await req.json() as { storeId: string; r2Paths: string[] }

    if (!storeId || !r2Paths?.length) {
      throw new Error('Faltan parámetros: storeId y r2Paths son requeridos.')
    }

    console.log(`[AI Function] Iniciando job para store ${storeId} con ${r2Paths.length} imágenes`)

    // 1. Insert ai_jobs row as 'pending' and respond immediately
    const { data: job, error: jobError } = await supabaseAdmin
      .from('ai_jobs')
      .insert({ store_id: storeId, status: 'pending' })
      .select('id')
      .single()

    if (jobError || !job) {
      throw new Error(`No se pudo crear el job en ai_jobs: ${jobError?.message}`)
    }
    jobId = job.id
    console.log(`[AI Function] Job creado: ${jobId}`)

    // 2. Mark as processing — this triggers Realtime on the client
    await supabaseAdmin
      .from('ai_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    // 3. Process each image sequentially (avoids parallel rate limit hammering)
    const allResults: object[] = []

    for (const r2Path of r2Paths) {
      console.log(`[AI Function] Procesando imagen: ${r2Path}`)
      const { base64, mimeType } = await fetchImageAsBase64(r2Path)
      const productData = await extractProductData(base64, mimeType)
      allResults.push(productData)

      // Insert extracted product into 'products' table
      const productPayload = productData as Record<string, unknown>
      const { error: productError } = await supabaseAdmin
        .from('products')
        .insert({
          store_id: storeId,
          name: productPayload.nombre ?? 'Producto sin nombre',
          description: productPayload.descripcion ?? null,
          price: productPayload.precio ?? null,
          category: productPayload.marca ?? null,
          image_url: `${Deno.env.get('R2_PUBLIC_URL')}/${r2Path}`,
          ai_generated: true,
        })

      if (productError) {
        console.error(`[AI Function] Error insertando producto para ${r2Path}:`, productError)
        // Non-fatal: continue with remaining images
      }
    }

    // 4. Mark job as done
    await supabaseAdmin
      .from('ai_jobs')
      .update({
        status: 'done',
        result_json: allResults,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    console.log(`[AI Function] ✅ Job ${jobId} completado exitosamente.`)

    return new Response(
      JSON.stringify({ jobId, status: 'pending', message: 'Procesamiento iniciado. Escucha cambios en ai_jobs.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[AI Function] Error crítico:', errorMessage)

    // If we have a jobId, mark it as error so the client can react via Realtime
    if (jobId) {
      await supabaseAdmin
        .from('ai_jobs')
        .update({
          status: 'error',
          error_msg: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
