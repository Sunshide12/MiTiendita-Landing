import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-file-name, x-store-id, x-content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    const storeId = req.headers.get('x-store-id')
    const filename = req.headers.get('x-file-name')
    const fileContentType = req.headers.get('x-content-type') || 'image/jpeg'

    if (!storeId || !filename) {
      throw new Error('Missing required headers: x-store-id, x-file-name')
    }

    const fileBody = await req.arrayBuffer()
    console.log(`[upload-to-r2] Received "${filename}" (${fileBody.byteLength} bytes) for store ${storeId}`)

    const aws = new AwsClient({
      accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
      secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
      service: 's3',
      region: 'auto',
    })

    const accountId = Deno.env.get('R2_ACCOUNT_ID')
    const bucket = Deno.env.get('R2_BUCKET_NAME')
    const key = `${storeId}/products/${crypto.randomUUID()}-${filename}`
    const r2Url = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`

    // Server-to-server upload — no CORS, no browser network issues
    const uploadRes = await aws.fetch(r2Url, {
      method: 'PUT',
      body: fileBody,
      headers: { 'Content-Type': fileContentType },
    })

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text()
      console.error(`[upload-to-r2] R2 error ${uploadRes.status}: ${errorText}`)
      throw new Error(`R2 upload failed (${uploadRes.status})`)
    }

    console.log(`[upload-to-r2] Success: ${key}`)

    return new Response(
      JSON.stringify({ path: key }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error(`[upload-to-r2] Error:`, error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
