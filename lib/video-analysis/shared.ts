import { logger } from '@/lib/logger'
import {
  createGoogleGenAIClient,
  fetchAsBase64,
  createInlineData,
  createFileData,
  uploadFileFromBuffer,
  type VideoMetadata,
  type ContentPart,
} from '@/lib/ai/google-genai-client'
import { isHttpUrl, normalizeStoragePath } from '@/lib/storage/supabase-storage'
import { downloadAsBuffer as downloadBufferFromStorage } from '@/lib/storage/supabase-storage-server'

/** Frame rates tuned for each analysis type. */
export const VIDEO_FPS = {
  RUNNING_GAIT: 5,       // Fast motion, need detail
  STRENGTH: 2,           // Slow tempo, fewer frames OK
  SKIING_CLASSIC: 8,
  SKIING_SKATING: 8,
  SKIING_DOUBLE_POLE: 6,
  HYROX_STATION: 4,
  DEFAULT: 1,
} as const

export const VIDEO_BUCKET = 'video-analysis'
export const INLINE_DATA_MAX_BYTES = 20 * 1024 * 1024 // 20 MB: Gemini inline_data
export const FILE_API_MAX_BYTES = 100 * 1024 * 1024 // 100 MB: matches upload limit

/** Standard analyzer result contract. */
export interface AnalysisResult {
  formScore: number
  issues: Array<{
    issue: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
    timestamp?: string
    description: string
  }>
  recommendations: Array<{
    priority: number
    recommendation: string
    explanation: string
  }>
  overallAssessment: string
  strengths: string[]
  areasForImprovement: string[]
}

/**
 * Fetch the video and hand Gemini the right kind of content part:
 *   - ≤ 20 MB   → inline base64
 *   - 20–100 MB → Google File API upload
 *   - http://   → inline (capped at 20 MB, same as Supabase path)
 */
export async function getVideoContentPart(
  videoUrl: string,
  client: ReturnType<typeof createGoogleGenAIClient>,
  videoMetadata?: VideoMetadata,
): Promise<ContentPart> {
  const path = normalizeStoragePath(VIDEO_BUCKET, videoUrl)
  if (!path && !isHttpUrl(videoUrl)) {
    throw new Error('Invalid video URL')
  }

  if (path) {
    const { buffer, mimeType: rawMime } = await downloadBufferFromStorage(
      VIDEO_BUCKET,
      path,
      { maxBytes: FILE_API_MAX_BYTES }
    )
    const mimeType = rawMime || 'video/mp4'

    if (buffer.byteLength <= INLINE_DATA_MAX_BYTES) {
      return createInlineData(buffer.toString('base64'), mimeType, videoMetadata)
    }

    logger.info('Video too large for inline data, using File API', {
      size: `${(buffer.byteLength / (1024 * 1024)).toFixed(1)}MB`,
      path,
    })
    const fileRef = await uploadFileFromBuffer(client, buffer, mimeType, `video-${Date.now()}`)
    return createFileData(fileRef.uri, fileRef.mimeType)
  }

  // HTTP URL fallback (legacy).
  const { base64, mimeType } = await fetchAsBase64(videoUrl, { maxBytes: INLINE_DATA_MAX_BYTES })
  return createInlineData(base64, mimeType, videoMetadata)
}
