/**
 * Ensure a value is an array. If not, return an empty array.
 * This is the bulletproof way to prevent "Cannot read properties of undefined (reading 'length')" crashes.
 *
 * Why not just use `?? []`?
 * - `undefined ?? []` → `[]` ✅
 * - `null ?? []` → `[]` ✅
 * - `0 ?? []` → `0` ❌ (not an array!)
 * - `{error: "msg"} ?? []` → `{error: "msg"}` ❌ (not an array!)
 * - `"string" ?? []` → `"string"` ❌ (not an array, but has .length)
 *
 * Array.isArray() is the ONLY reliable guard.
 */
export function ensureArray<T>(value: T[] | undefined | null | unknown): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Normalize a product object to ensure all array fields are defined.
 * This prevents "Cannot read properties of undefined (reading 'length')" crashes
 * when product data comes from Shopify or other external sources where fields
 * may be undefined.
 */
export function normalizeProduct<T extends Record<string, any>>(product: T): T & {
  images: string[];
  tags: string[];
  occasions: string[];
  recipientTypes: string[];
  relationships: string[];
} {
  return {
    ...product,
    images: ensureArray(product.images),
    tags: ensureArray(product.tags),
    occasions: ensureArray(product.occasions),
    recipientTypes: ensureArray(product.recipientTypes),
    relationships: ensureArray(product.relationships),
  };
}

