/**
 * Domain types for the landing page.
 * These are manually maintained until Supabase types are generated.
 * Once src/types/supabase.ts exists, these can be replaced with
 * Database['public']['Tables']['stores']['Row'] etc.
 */

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  dns_record_id: string | null;
  created_at: string;
}

export interface CropParams {
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  pixels: { x: number; y: number; width: number; height: number };
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  image_url: string | null;
  image_crop: CropParams | null;
  ai_generated: boolean;
  created_at: string;
}

export type AIJobStatus = 'pending' | 'processing' | 'done' | 'error';

export interface AIJob {
  id: string;
  store_id: string;
  status: AIJobStatus;
  r2_paths: string[];
  result_json: Record<string, unknown> | null;
  error_msg: string | null;
  created_at: string;
  updated_at: string;
}
