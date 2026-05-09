import { createBrowserClient } from '@/lib/supabase';

interface FileMetadata {
  filename: string;
  contentType: string;
}

export const getPresignedUrls = async (storeId: string, files: FileMetadata[]) => {
  console.log(`[Upload Service] Solicitando Presigned URLs para ${files.length} archivos...`, files);
  const supabase = createBrowserClient();
  
  try {
    const urlPromises = files.map(async (file) => {
      console.log(`[Upload Service] Invocando Edge Function para: ${file.filename}`);
      const { data, error } = await supabase.functions.invoke('generate-r2-presigned-url', {
        body: { 
          storeId, 
          filename: file.filename, 
          contentType: file.contentType 
        }
      });

      if (error) {
        console.error(`[Upload Service] Error de la Edge Function para ${file.filename}:`, error);
        throw error;
      }
      
      if (!data?.url || !data?.path) {
        console.error(`[Upload Service] Respuesta inválida de Edge Function:`, data);
        throw new Error('Respuesta inválida de la Edge Function.');
      }
      
      console.log(`[Upload Service] Presigned URL recibida exitosamente para ${file.filename}`);
      return { presignedUrl: data.url, r2Path: data.path };
    });

    const results = await Promise.all(urlPromises);
    console.log(`[Upload Service] Todas las Presigned URLs generadas exitosamente.`);
    return results;
  } catch (err) {
    console.error(`[Upload Service] Error crítico obteniendo Presigned URLs:`, err);
    throw err;
  }
};

export const uploadFilesToR2 = async (files: File[], urls: { presignedUrl: string, r2Path: string }[]) => {
  console.log(`[Upload Service] Iniciando subida directa a R2 para ${files.length} archivos...`);
  const r2Paths: string[] = [];
  
  const uploadPromises = files.map(async (file, index) => {
    const { presignedUrl, r2Path } = urls[index];
    console.log(`[Upload Service] Subiendo archivo "${file.name}" a R2...`);
    
    try {
      const res = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
      });

      if (!res.ok) {
        console.error(`[Upload Service] R2 devolvió estado HTTP ${res.status} al subir ${file.name}`);
        // Intentar leer el texto del error si R2 devuelve un XML con detalles
        const errorText = await res.text();
        console.error(`[Upload Service] Detalles del error R2:`, errorText);
        throw new Error(`Error subiendo ${file.name} (Status: ${res.status})`);
      }
      
      console.log(`[Upload Service] Archivo "${file.name}" subido exitosamente a R2.`);
      r2Paths.push(r2Path);
    } catch (err) {
      console.error(`[Upload Service] Error de red o de CORS al intentar subir "${file.name}":`, err);
      throw err;
    }
  });

  try {
    await Promise.all(uploadPromises);
    console.log(`[Upload Service] Todos los archivos se subieron correctamente.`);
    return r2Paths;
  } catch (err) {
    console.error(`[Upload Service] La subida múltiple falló en uno o más archivos.`);
    throw err;
  }
};
