import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

/**
 * For legacy public URLs, tries to extract the object path.
 * Supports:
 *   /storage/v1/object/public/<bucket>/<path>
 */
export function tryExtractPublicObjectPath(urlString: string, bucket: string): string | null {
  try {
    const url = new URL(urlString)
    const re = new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`)
    const match = url.pathname.match(re)
    return match?.[1] ? decodeURIComponent(match[1]) : null
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

export async function createSignedUrl(bucket: string, path: string, expiresInSeconds = 60 * 10) {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
  if (error || !data?.signedUrl) {
    throw error || new Error('Failed to create signed URL')
  }
  return data.signedUrl
}

export async function downloadAsBase64(bucket: string, path: string): Promise<{ base64: string; mimeType?: string }> {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.storage.from(bucket).download(path)
  if (error || !data) {
    throw error || new Error('Failed to download object')
  }
  const arrayBuffer = await data.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = data.type || undefined
  return { base64, mimeType }
}

// ============================================
// Exercise Images Storage (Public Bucket)
// ============================================

const EXERCISE_IMAGES_BUCKET = 'exercise-images'

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
  return `${supabaseUrl}/storage/v1/object/public/${EXERCISE_IMAGES_BUCKET}/${path}`
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

/**
 * Upload an exercise image to Supabase Storage
 * @param file - File or Buffer to upload
 * @param path - Storage path (e.g., "system/posterior-chain/squat-1.webp")
 * @param contentType - MIME type (default: image/webp)
 * @returns The storage path
 */
export async function uploadExerciseImage(
  file: File | Buffer,
  path: string,
  contentType: string = 'image/webp'
): Promise<string> {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.storage
    .from(EXERCISE_IMAGES_BUCKET)
    .upload(path, file, {
      contentType,
      upsert: true
    })

  if (error) {
    throw error
  }
  return data.path
}

/**
 * Delete an exercise image from Supabase Storage
 * @param path - Storage path to delete
 */
export async function deleteExerciseImage(path: string): Promise<void> {
  const admin = createAdminSupabaseClient()
  const { error } = await admin.storage
    .from(EXERCISE_IMAGES_BUCKET)
    .remove([path])

  if (error) {
    throw error
  }
}
























