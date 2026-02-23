import 'server-only'

import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { EXERCISE_IMAGES_BUCKET } from '@/lib/storage/supabase-storage'

export async function createSignedUploadUrl(bucket: string, path: string) {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path)
  if (error || !data) {
    throw error || new Error('Failed to create signed upload URL')
  }
  return { signedUrl: data.signedUrl, token: data.token, path: data.path }
}

export async function createSignedUrl(bucket: string, path: string, expiresInSeconds = 60 * 10) {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
  if (error || !data?.signedUrl) {
    throw error || new Error('Failed to create signed URL')
  }
  return data.signedUrl
}

export async function downloadAsBase64(
  bucket: string,
  path: string,
  options?: { maxBytes?: number }
): Promise<{ base64: string; mimeType?: string }> {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.storage.from(bucket).download(path)
  if (error || !data) {
    throw error || new Error('Failed to download object')
  }

  const maxBytes = options?.maxBytes
  if (maxBytes && typeof (data as any).size === 'number' && (data as any).size > maxBytes) {
    throw new Error('FILE_TOO_LARGE')
  }
  const arrayBuffer = await data.arrayBuffer()
  if (maxBytes && arrayBuffer.byteLength > maxBytes) {
    throw new Error('FILE_TOO_LARGE')
  }
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = data.type || undefined
  return { base64, mimeType }
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
      upsert: true,
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

/**
 * Upload a file to Supabase Storage (generic upload)
 * @param path - Full storage path including bucket (e.g., "adhoc-workout-images/clientId/file.jpg")
 * @param data - File buffer to upload
 * @param contentType - MIME type of the file
 * @returns Object with success status and URL or error
 */
export async function uploadToSupabaseStorage(
  path: string,
  data: Buffer,
  contentType: string
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    const admin = createAdminSupabaseClient()

    // Parse bucket and file path from the full path
    const pathParts = path.split('/')
    const bucket = pathParts[0]
    const filePath = pathParts.slice(1).join('/')

    const { data: uploadData, error } = await admin.storage
      .from(bucket)
      .upload(filePath, data, {
        contentType,
        upsert: true,
      })

    if (error) {
      return { success: false, error: error.message }
    }

    // Get public URL
    const { data: urlData } = admin.storage.from(bucket).getPublicUrl(uploadData.path)

    return { success: true, url: urlData.publicUrl }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}


