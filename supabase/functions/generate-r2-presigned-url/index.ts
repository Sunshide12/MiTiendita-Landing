import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// EL CAMBIO ESTRELLA: Usamos aws4fetch, pura magia Edge, en lugar del SDK de AWS
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Manejar el Preflight de CORS con status 200 explícito
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    const { filename, contentType, storeId } = await req.json()

    // 2. Instanciar el cliente ligero
    const aws = new AwsClient({
      accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
      secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
      service: 's3',
      region: 'auto',
    })

    // 3. Construir la URL exacta del archivo en tu bucket ecommercemt
    const accountId = Deno.env.get('R2_ACCOUNT_ID')
    const bucket = Deno.env.get('R2_BUCKET_NAME')
    const key = `${storeId}/products/${crypto.randomUUID()}-${filename}`
    
    const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`)

    // 4. Establecer expiración por seguridad (1 hora = 3600 segundos)
    url.searchParams.set('X-Amz-Expires', '3600')

    // 5. La Magia: Firmar la URL
    // 'signQuery: true' pasa la contraseña temporal a la URL en lugar de los Headers
    // para que tu React Island pueda hacer el PUT directo.
    const signedRequest = await aws.sign(url, {
      method: 'PUT',
      aws: { signQuery: true }
    })

    // 6. Devolver la Presigned URL generada (signedRequest.url)
    return new Response(
      JSON.stringify({ url: signedRequest.url, path: key }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})