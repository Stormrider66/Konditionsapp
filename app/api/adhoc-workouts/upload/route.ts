/**
 * Ad-Hoc Workout File Upload API
 *
 * POST /api/adhoc-workouts/upload - Upload photo or voice recording
 *
 * Uploads the file to Supabase storage and returns the URL.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { uploadToSupabaseStorage } from '@/lib/storage/supabase-storage-server'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// Upload routes must run on Node.js (Edge can't stream large multipart
// bodies) and need a longer timeout than the Vercel default for slower
// mobile connections.
export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

// File size limits
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_AUDIO_SIZE = 15 * 1024 * 1024 // 15MB (Gemini limit)

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]

const ALLOWED_AUDIO_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/m4a',
  'audio/x-m4a',
]

export async function POST(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { clientId, user } = resolved
    locale = resolveRequestLocale(request, user.language)

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as 'image' | 'audio' | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: t(locale, 'No file provided', 'Ingen fil har skickats') },
        { status: 400 }
      )
    }

    // Normalize type (frontend sends PHOTO/VOICE, we accept image/audio as well)
    const normalizedType = type?.toUpperCase() === 'PHOTO' || type === 'image' ? 'image' :
      type?.toUpperCase() === 'VOICE' || type === 'audio' ? 'audio' : null

    if (!normalizedType) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Invalid file type. Must be "PHOTO", "VOICE", "image", or "audio"', 'Ogiltig filtyp. Måste vara "PHOTO", "VOICE", "image" eller "audio"') },
        { status: 400 }
      )
    }

    // Validate file type
    const isImage = normalizedType === 'image'
    const allowedTypes = isImage ? ALLOWED_IMAGE_TYPES : ALLOWED_AUDIO_TYPES
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_AUDIO_SIZE

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: t(locale, `Invalid file format. Allowed types: ${allowedTypes.join(', ')}`, `Ogiltigt filformat. Tillåtna typer: ${allowedTypes.join(', ')}`),
        },
        { status: 400 }
      )
    }

    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024)
      return NextResponse.json(
        { success: false, error: t(locale, `File too large. Maximum size: ${maxSizeMB}MB`, `Filen är för stor. Maxstorlek: ${maxSizeMB} MB`) },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension = getExtensionFromMimeType(file.type)
    const filename = `${clientId}/${timestamp}.${extension}`
    const bucket = isImage ? 'adhoc-workout-images' : 'adhoc-workout-audio'
    const storagePath = `${bucket}/${filename}`

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase storage
    const uploadResult = await uploadToSupabaseStorage(storagePath, buffer, file.type)

    if (!uploadResult.success) {
      logger.error('Failed to upload ad-hoc workout file', { error: uploadResult.error })
      return NextResponse.json(
        { success: false, error: t(locale, 'Failed to upload file', 'Kunde inte ladda upp filen') },
        { status: 500 }
      )
    }

    logger.info('Ad-hoc workout file uploaded', {
      athleteId: clientId,
      type,
      mimeType: file.type,
      size: file.size,
      path: storagePath,
    })

    return NextResponse.json({
      success: true,
      data: {
        url: uploadResult.url,
        path: storagePath,
        mimeType: file.type,
        size: file.size,
      },
    })
  } catch (error) {
    console.error('Error uploading ad-hoc workout file:', error)

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to upload file', 'Kunde inte ladda upp filen') },
      { status: 500 }
    )
  }
}

function getExtensionFromMimeType(mimeType: string): string {
  const extensionMap: Record<string, string> = {
    // Images
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
    // Audio
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
  }

  return extensionMap[mimeType] || 'bin'
}
