import { createBrowserClient } from '@/lib/supabase';

export const triggerAIProcessing = async (storeId: string, r2Paths: string[]) => {
  const supabase = createBrowserClient();
  const { error } = await supabase.functions.invoke('process-product-images', {
    body: { storeId, r2Paths }
  });

  if (error) throw error;
};
