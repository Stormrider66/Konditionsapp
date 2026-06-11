import { logger } from '@/lib/logger'
import {
  createGoogleGenAIClient,
  fetchAsBase64,
  createInlineData,
  createFileData,
  createText,
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

/** One video of a multi-view capture group, with its prompt label. */
export interface LabeledVideoInput {
  videoUrl: string
  label: string
}

/**
 * Resolve content parts for a multi-view capture group: each video is
 * preceded by its text label so the prompt can reference views by name.
 *
 * The 20 MB inline budget applies to the whole request, not per video,
 * so videos are inlined only if their combined size fits — otherwise
 * every video goes through the File API.
 */
export async function getGroupVideoContentParts(
  videos: LabeledVideoInput[],
  client: ReturnType<typeof createGoogleGenAIClient>,
  videoMetadata?: VideoMetadata,
): Promise<ContentPart[]> {
  const downloads: Array<{ label: string; buffer: Buffer; mimeType: string }> = []
  for (const video of videos) {
    const path = normalizeStoragePath(VIDEO_BUCKET, video.videoUrl)
    if (!path) {
      throw new Error('Invalid video URL in capture group')
    }
    const { buffer, mimeType } = await downloadBufferFromStorage(VIDEO_BUCKET, path, {
      maxBytes: FILE_API_MAX_BYTES,
    })
    downloads.push({ label: video.label, buffer, mimeType: mimeType || 'video/mp4' })
  }

  const totalBytes = downloads.reduce((sum, d) => sum + d.buffer.byteLength, 0)
  const inlineAll = totalBytes <= INLINE_DATA_MAX_BYTES
  if (!inlineAll) {
    logger.info('Capture group too large for inline data, using File API', {
      totalSize: `${(totalBytes / (1024 * 1024)).toFixed(1)}MB`,
      videos: downloads.length,
    })
  }

  const parts: ContentPart[] = []
  for (const { label, buffer, mimeType } of downloads) {
    parts.push(createText(label))
    if (inlineAll) {
      parts.push(createInlineData(buffer.toString('base64'), mimeType, videoMetadata))
    } else {
      const fileRef = await uploadFileFromBuffer(client, buffer, mimeType, `video-${Date.now()}`)
      parts.push(createFileData(fileRef.uri, fileRef.mimeType))
    }
  }
  return parts
}
