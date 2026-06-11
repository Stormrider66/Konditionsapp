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
): Promise<{ storagePath: string }> {
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

  return { storagePath }
}

/**
 * The bucket is private — images are served through the authenticated
 * /api/ai/visual-reports/[id]/image route, which redirects to a short-lived
 * signed URL created here.
 */
export async function createVisualReportSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string> {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.storage
    .from(VISUAL_REPORTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)

  if (error || !data?.signedUrl) {
    throw new Error(`Visual report signed URL failed: ${error?.message || 'no url'}`)
  }
  return data.signedUrl
}
