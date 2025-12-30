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
























