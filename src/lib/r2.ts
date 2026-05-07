/**
 * Generates a consistent R2 path for product images.
 * Must match the path convention used by the frontend and Edge Functions.
 *
 * Pattern: {storeId}/products/{productId}/{filename}
 */
export function r2Path(storeId: string, productId: string, filename: string): string {
  return `${storeId}/products/${productId}/${filename}`;
}

/**
 * Returns the full public URL for an R2 object.
 */
export function r2PublicUrl(path: string): string {
  const baseUrl = import.meta.env.PUBLIC_R2_PUBLIC_URL;
  return `${baseUrl.replace(/\/$/, '')}/${path}`;
}
