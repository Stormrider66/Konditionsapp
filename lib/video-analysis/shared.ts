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

/** One video of a multi-view capture group, as stored on VideoAnalysis. */
export interface GroupVideoRef {
  videoUrl: string
  cameraAngle: string | null
}

/**
 * Multi-view prompt block shared by the analyzers. Prepend (or insert) it
 * into the sport prompt when a capture group is analyzed; the
 * crossReferenceHint line carries the sport-specific guidance on which
 * faults each camera angle reveals.
 */
export function buildMultiViewPromptBlock(
  viewAngles: string[],
  locale: 'en' | 'sv',
  crossReferenceHint: { en: string; sv: string },
): string {
  const angles = viewAngles.join(', ')

  if (locale === 'en') {
    return `## MULTI-CAMERA SETUP
You receive ${viewAngles.length} videos of the SAME attempt, filmed SIMULTANEOUSLY from different camera angles: ${angles}. Each video is preceded by a label naming its angle.
- This is ONE attempt — treat the videos as one joint observation, never as separate performances, and give ONE combined assessment.
- ${crossReferenceHint.en}
- When you report an issue, state which view(s) support the observation.
- The cameras started at roughly the same moment, so timestamps refer to one shared timeline.
- Quality gate: the analysis is valid if at least ONE view clearly shows the activity; mark it invalid only if NO view does.

`
  }

  return `## FLERKAMERAUPPSÄTTNING
Du får ${viewAngles.length} videor av SAMMA försök, filmade SAMTIDIGT från olika kameravinklar: ${angles}. Varje video föregås av en etikett som anger dess vinkel.
- Detta är ETT försök — behandla videorna som en gemensam observation, aldrig som separata prestationer, och ge EN samlad bedömning.
- ${crossReferenceHint.sv}
- Ange vilken eller vilka vinklar som stödjer varje observation du rapporterar.
- Kamerorna startade ungefär samtidigt, så tidsstämplar avser en gemensam tidslinje.
- Kvalitetsgrind: analysen är giltig om minst EN vinkel tydligt visar aktiviteten; markera den som ogiltig bara om INGEN vinkel gör det.

`
}

/**
 * Resolve the video content parts for an analyzer input — single video or
 * multi-view capture group — plus the resolved view-angle names
 * (undefined for single-video analyses).
 */
export async function getAnalyzerVideoParts(
  input: { videoUrl: string; groupVideos?: GroupVideoRef[] },
  client: ReturnType<typeof createGoogleGenAIClient>,
  videoMetadata: VideoMetadata | undefined,
  locale: 'en' | 'sv',
): Promise<{ parts: ContentPart[]; viewAngles?: string[] }> {
  const groupVideos = input.groupVideos && input.groupVideos.length > 1 ? input.groupVideos : null
  if (!groupVideos) {
    return { parts: [await getVideoContentPart(input.videoUrl, client, videoMetadata)] }
  }

  const viewAngles = groupVideos.map((v, idx) => v.cameraAngle || `ANGLE_${idx + 1}`)
  const parts = await getGroupVideoContentParts(
    groupVideos.map((v, idx) => ({
      videoUrl: v.videoUrl,
      label: locale === 'sv'
        ? `Video ${idx + 1} — vinkel ${viewAngles[idx]}:`
        : `Video ${idx + 1} — ${viewAngles[idx]} view:`,
    })),
    client,
    videoMetadata,
  )
  return { parts, viewAngles }
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
