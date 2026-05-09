import { createBrowserClient } from '@/lib/supabase';

/**
 * Upload files to R2 via Supabase Edge Function proxy.
 * 
 * Browser → Supabase Edge Function → R2 (server-to-server)
 * This avoids ERR_CONNECTION_TIMED_OUT from direct browser-to-R2 PUTs.
 */
export const uploadFilesToR2 = async (storeId: string, files: File[]): Promise<string[]> => {
  console.log(`[Upload] Starting proxy upload of ${files.length} file(s)...`);
  const supabase = createBrowserClient();
  const r2Paths: string[] = [];

  for (const file of files) {
    console.log(`[Upload] Uploading "${file.name}" (${(file.size / 1024).toFixed(0)} KB)...`);

    const { data, error } = await supabase.functions.invoke('upload-to-r2', {
      body: file,
      headers: {
        'x-store-id': storeId,
        'x-file-name': file.name,
        'x-content-type': file.type || 'image/jpeg',
      },
    });

    if (error) {
      console.error(`[Upload] Failed for "${file.name}":`, error);
      throw new Error(`Error subiendo "${file.name}": ${error.message}`);
    }

    if (!data?.path) {
      throw new Error(`Respuesta inválida para "${file.name}"`);
    }

    console.log(`[Upload] "${file.name}" → ${data.path}`);
    r2Paths.push(data.path);
  }

  console.log(`[Upload] All ${files.length} file(s) uploaded successfully.`);
  return r2Paths;
};
