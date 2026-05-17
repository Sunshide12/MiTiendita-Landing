import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import OpenAI from "https://esm.sh/openai@4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── AI Clients ───────────────────────────────────────────────────────────────

function buildClients() {
  const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: Deno.env.get('OPENROUTER_API_KEY') ?? 'no-key',
    defaultHeaders: {
      'HTTP-Referer': 'https://mitienda.com',
      'X-Title': 'MiTienda SaaS',
    },
  })

  return { openrouter }
}

// Priority list — starts with cheapest/fastest, falls back on rate limit
function buildModelList(clients: ReturnType<typeof buildClients>) {
  return [
    // La familia Gemini (Los mejores en visión gratuita)
    { client: clients.openrouter, model: 'google/gemini-2.0-flash-001:free',      name: 'Gemini 2.0 Flash (Free)' },
    { client: clients.openrouter, model: 'google/gemini-2.0-flash-lite-001:free', name: 'Gemini 2.0 Flash Lite (Free)' },
    { client: clients.openrouter, model: 'google/gemini-1.5-flash:free',           name: 'Gemini 1.5 Flash (Free)' },
    { client: clients.openrouter, model: 'google/gemini-1.5-flash-8b:free',        name: 'Gemini 1.5 Flash 8B (Free)' },
    { client: clients.openrouter, model: 'google/gemini-2.0-pro-exp-02-05:free',   name: 'Gemini 2.0 Pro Exp (Free)' },

    // Modelos Llama Vision (Muy rápidos y livianos)
    { client: clients.openrouter, model: 'meta-llama/llama-3.2-11b-vision-instruct:free', name: 'Llama 3.2 Vision 11B (Free)' },
    { client: clients.openrouter, model: 'meta-llama/llama-3.2-90b-vision-instruct:free', name: 'Llama 3.2 Vision 90B (Free)' },

    // Modelos Qwen (Excelentes para detectar texto en imágenes/OCR)
    { client: clients.openrouter, model: 'qwen/qwen-2-vl-7b-instruct:free',        name: 'Qwen 2 VL 7B (Free)' },
    
    // Otros modelos experimentales con visión
    { client: clients.openrouter, model: 'mistralai/pixtral-12b:free',             name: 'Pixtral 12B (Free)' },
    { client: clients.openrouter, model: 'microsoft/phi-3-vision-128k-instruct:free', name: 'Phi-3 Vision (Free)' }
  ]
}

const PROMPT = `You are an e-commerce and copywriting expert. Analyze this product image and return ONLY a valid JSON object with the exact structure below (no markdown, no extra text):

{
  "name": "Commercial product name",
  "brand": "MANUFACTURER brand (e.g., Apple, Nike). Do NOT confuse with the seller/store name",
  "model": "Specific model or version",
  "price": null,
  "description": "Short, persuasive marketing copy (max 2 lines / 150 chars). Do NOT just copy text from the image. Highlight the main benefit to drive sales."
}

RULES:
- "brand" = the actual creator/manufacturer, not the retailer.
- "description" = original, compelling copy.
- If a value cannot be determined with certainty, use null.
- Output JSON ONLY.`

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJSON(raw: string): object {
  try {
    const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim()
    return JSON.parse(clean)
  } catch (err) {
    throw new Error('La IA no devolvió un JSON válido.')
  }
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
  const uint8Array = new Uint8Array(arrayBuffer)
  let binary = ''
  const len = uint8Array.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i])
  }
  const base64 = btoa(binary)
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
      const result = parseJSON(raw) // Si falla el JSON, salta al catch y prueba otro modelo
      console.log(`[AI Function] ✅ Éxito con: ${name}`)
      return result
      
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.warn(`[AI Function] ⚠️ Fallo con ${name} (${errMsg}). Saltando al siguiente...`)
      lastError = error
      // 🔥 EL CAMBIO CLAVE: Continuar siempre, sin importar el tipo de error
      continue
    }
  }

  console.error('[AI Function] ❌ Todos los modelos de la lista fallaron.')
  throw lastError
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

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

    const { data: job, error: jobError } = await supabaseAdmin
      .from('ai_jobs')
      .insert({ store_id: storeId, status: 'processing' }) // Se marca como processing de una vez
      .select('id')
      .single()

    if (jobError || !job) {
      throw new Error(`No se pudo crear el job en ai_jobs: ${jobError?.message}`)
    }
    jobId = job.id
    console.log(`[AI Function] Job creado: ${jobId}`)

    const allResults: object[] = []

    for (let i = 0; i < r2Paths.length; i++) {
      const r2Path = r2Paths[i]
      console.log(`[AI Function] Procesando imagen ${i + 1}/${r2Paths.length}: ${r2Path}`)

      if (i > 0) {
        console.log(`[AI Function] Esperando 2s para evitar rate limit global...`)
        await new Promise(r => setTimeout(r, 2000))
      }

      const { base64, mimeType } = await fetchImageAsBase64(r2Path)
      const productData = await extractProductData(base64, mimeType)
      allResults.push(productData)

      const p = productData as Record<string, unknown>
      const { error: productError } = await supabaseAdmin
        .from('products')
        .insert({
          store_id: storeId,
          name: p.name ?? 'Unnamed product',
          description: p.description ?? null,
          price: p.price ?? null,
          category: p.brand ?? null,
          image_url: `${Deno.env.get('R2_PUBLIC_URL')}/${r2Path}`,
          ai_generated: true,
        })

      if (productError) {
        console.error(`[AI Function] Error insertando producto para ${r2Path}:`, productError)
      }
    }

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
      JSON.stringify({ jobId, status: 'done', message: 'Procesamiento completado.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[AI Function] Error crítico:', errorMessage)

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
