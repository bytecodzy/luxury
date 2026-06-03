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
