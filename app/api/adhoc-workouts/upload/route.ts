/**
 * Ad-Hoc Workout File Upload API
 *
 * POST /api/adhoc-workouts/upload - Upload photo or voice recording
 *
 * Uploads the file to Supabase storage and returns the URL.
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { uploadToSupabaseStorage } from '@/lib/storage/supabase-storage-server'
import { logger } from '@/lib/logger'

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
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as 'image' | 'audio' | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Normalize type (frontend sends PHOTO/VOICE, we accept image/audio as well)
    const normalizedType = type?.toUpperCase() === 'PHOTO' || type === 'image' ? 'image' :
      type?.toUpperCase() === 'VOICE' || type === 'audio' ? 'audio' : null

    if (!normalizedType) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Must be "PHOTO", "VOICE", "image", or "audio"' },
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
          error: `Invalid file format. Allowed types: ${allowedTypes.join(', ')}`,
        },
        { status: 400 }
      )
    }

    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024)
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size: ${maxSizeMB}MB` },
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
        { success: false, error: 'Failed to upload file' },
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
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
