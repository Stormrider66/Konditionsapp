/**
 * Visual Report Storage
 *
 * Handles uploading generated report images to Supabase Storage.
 */

import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const VISUAL_REPORTS_BUCKET = 'visual-reports'

export async function uploadVisualReport(
  reportType: string,
  clientId: string,
  imageBuffer: Buffer,
  mimeType: string
): Promise<{ storagePath: string; publicUrl: string }> {
  const extension = mimeType === 'image/webp' ? 'webp' : mimeType === 'image/jpeg' ? 'jpg' : 'png'
  const storagePath = `${reportType}/${clientId}/${Date.now()}.${extension}`

  const admin = createAdminSupabaseClient()

  const { error: uploadError } = await admin.storage
    .from(VISUAL_REPORTS_BUCKET)
    .upload(storagePath, imageBuffer, {
      contentType: mimeType,
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Visual report upload failed: ${uploadError.message}`)
  }

  const { data: urlData } = admin.storage
    .from(VISUAL_REPORTS_BUCKET)
    .getPublicUrl(storagePath)

  return {
    storagePath,
    publicUrl: urlData.publicUrl,
  }
}
