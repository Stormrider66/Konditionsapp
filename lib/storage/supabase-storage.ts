export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

/**
 * For legacy public URLs, tries to extract the object path.
 * Supports:
 *   /storage/v1/object/public/<bucket>/<path>
 *   /storage/v1/object/sign/<bucket>/<path>
 *   /storage/v1/object/<bucket>/<path>
 */
export function tryExtractPublicObjectPath(urlString: string, bucket: string): string | null {
  try {
    const url = new URL(urlString)
    const patterns = [
      new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`),
      new RegExp(`/storage/v1/object/sign/${bucket}/(.+)$`),
      new RegExp(`/storage/v1/object/${bucket}/(.+)$`),
    ]

    for (const re of patterns) {
      const match = url.pathname.match(re)
      if (match?.[1]) return decodeURIComponent(match[1])
    }
    return null
  } catch {
    return null
  }
}

/**
 * Normalize a stored DB value into a Supabase Storage object path.
 * - If it's a legacy public URL, parse out the path
 * - Otherwise treat it as already being a path
 */
export function normalizeStoragePath(bucket: string, value: string): string | null {
  if (!value) return null
  if (isHttpUrl(value)) {
    return tryExtractPublicObjectPath(value, bucket)
  }
  return value
}

// ============================================
// Exercise Images Storage (Public Bucket)
// ============================================

export const EXERCISE_IMAGES_BUCKET = 'exercise-images'

/**
 * Get public URL for an exercise image stored in Supabase
 * @param path - Storage path (e.g., "system/posterior-chain/squat-1.webp")
 * @returns Full public URL
 */
export function getExerciseImagePublicUrl(path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined')
  }
  // Remove leading slash if present to avoid double slashes in URL
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  return `${supabaseUrl}/storage/v1/object/public/${EXERCISE_IMAGES_BUCKET}/${normalizedPath}`
}

/**
 * Resolve an array of storage paths to full public URLs
 * @param paths - Array of storage paths
 * @returns Array of full public URLs
 */
export function resolveExerciseImageUrls(paths: string[] | null | undefined): string[] {
  if (!paths || !Array.isArray(paths)) return []
  return paths.map(path => getExerciseImagePublicUrl(path))
}

































