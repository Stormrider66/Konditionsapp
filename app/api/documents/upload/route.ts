/**
 * Document Upload API
 *
 * Two flows, picked by `action`:
 *
 * 1. Text / Markdown (small, stored inline in the DB):
 *      POST { action: 'upload-text', name, description?, fileType, mimeType, content }
 *
 * 2. PDF / Excel (large, via signed-URL direct-to-Supabase upload):
 *      POST { action: 'get-upload-url', fileName, fileType, fileSize, mimeType }
 *        → { signedUrl, token, path, contentType }
 *      (client PUTs the file directly to signedUrl)
 *      POST { action: 'confirm-upload', uploadPath, name, description?, fileType, mimeType, fileSize }
 *        → { success, document }
 *
 * This replaces the old FormData POST that streamed the whole file through
 * the Vercel Function body. Direct-to-storage removes the 50MB-through-the-
 * function memory/bandwidth cost and decouples upload timeouts from
 * function limits.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { DocumentType } from '@prisma/client'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { createSignedUploadUrl } from '@/lib/storage/supabase-storage-server'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const DOCUMENTS_BUCKET = 'coach-documents'

const DIRECT_UPLOAD_TYPES: DocumentType[] = ['PDF', 'EXCEL']
const INLINE_TYPES: DocumentType[] = ['TEXT', 'MARKDOWN']
const ALL_TYPES: DocumentType[] = [...DIRECT_UPLOAD_TYPES, ...INLINE_TYPES]

const MAX_DIRECT_UPLOAD_SIZE = 50 * 1024 * 1024 // 50MB — enforced in signed-url step
const MAX_INLINE_CONTENT_SIZE = 2 * 1024 * 1024 // 2MB — plenty for text/markdown
const MAX_EXTENSION_LENGTH = 10

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()

    const rateLimited = await rateLimitJsonResponse('documents:upload', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const action = typeof body?.action === 'string' ? body.action : null

    if (action === 'get-upload-url') {
      return handleGetUploadUrl(body, user.id)
    }
    if (action === 'confirm-upload') {
      return handleConfirmUpload(body, user.id)
    }
    if (action === 'upload-text') {
      return handleUploadText(body, user.id)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    logger.error('Document upload error', {}, error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: 'Failed to upload document',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : error instanceof Error
              ? error.message
              : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function handleGetUploadUrl(body: Record<string, unknown>, userId: string) {
  const { fileName, fileType, fileSize, mimeType } = body as {
    fileName?: string
    fileType?: string
    fileSize?: number
    mimeType?: string
  }

  if (!fileName || !fileType || !fileSize) {
    return NextResponse.json(
      { error: 'Missing required fields: fileName, fileType, fileSize' },
      { status: 400 }
    )
  }

  if (!DIRECT_UPLOAD_TYPES.includes(fileType as DocumentType)) {
    return NextResponse.json(
      { error: 'get-upload-url only supports PDF and EXCEL. Use upload-text for TEXT/MARKDOWN.' },
      { status: 400 }
    )
  }

  if (fileSize <= 0 || fileSize > MAX_DIRECT_UPLOAD_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum size: 50MB' },
      { status: 400 }
    )
  }

  const timestamp = Date.now()
  const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const rawExt = fileName.split('.').pop() || ''
  const extension = /^[a-zA-Z0-9]{1,10}$/.test(rawExt) ? rawExt.toLowerCase() : ''
  const filename = `${userId}/${timestamp}-${safeFileName}`

  void extension // reserved; Supabase key already has the extension via safeFileName
  void MAX_EXTENSION_LENGTH

  const { signedUrl, token, path } = await createSignedUploadUrl(DOCUMENTS_BUCKET, filename)

  logger.debug('Document upload URL created', { path, fileSize, fileType })

  return NextResponse.json({
    signedUrl,
    token,
    path,
    contentType: mimeType || inferMimeType(fileType as DocumentType),
  })
}

async function handleConfirmUpload(body: Record<string, unknown>, userId: string) {
  const { uploadPath, name, description, fileType, mimeType, fileSize } = body as {
    uploadPath?: string
    name?: string
    description?: string | null
    fileType?: string
    mimeType?: string
    fileSize?: number
  }

  if (!uploadPath || !name || !fileType) {
    return NextResponse.json(
      { error: 'Missing required fields: uploadPath, name, fileType' },
      { status: 400 }
    )
  }

  if (!DIRECT_UPLOAD_TYPES.includes(fileType as DocumentType)) {
    return NextResponse.json({ error: 'Invalid fileType for direct upload' }, { status: 400 })
  }

  // Enforce ownership: the signed-URL path starts with `${userId}/`.
  if (!uploadPath.startsWith(`${userId}/`)) {
    return NextResponse.json({ error: 'Invalid upload path' }, { status: 403 })
  }

  if (typeof fileSize === 'number' && fileSize > MAX_DIRECT_UPLOAD_SIZE) {
    return NextResponse.json({ error: 'Reported file size exceeds 50MB limit' }, { status: 400 })
  }

  const document = await prisma.coachDocument.create({
    data: {
      coachId: userId,
      name: name.trim(),
      description: description?.trim() || null,
      fileType: fileType as DocumentType,
      fileUrl: uploadPath,
      fileSize: typeof fileSize === 'number' ? fileSize : 0,
      mimeType: mimeType || inferMimeType(fileType as DocumentType),
      processingStatus: 'PENDING',
    },
  })

  logger.info('Document upload confirmed', { userId, documentId: document.id })

  return NextResponse.json({
    success: true,
    document,
    uploadPath,
    message: 'Document uploaded. Use "Generate" to create embeddings.',
  })
}

async function handleUploadText(body: Record<string, unknown>, userId: string) {
  const { name, description, fileType, mimeType, content } = body as {
    name?: string
    description?: string | null
    fileType?: string
    mimeType?: string
    content?: string
  }

  if (!name || !fileType || typeof content !== 'string') {
    return NextResponse.json(
      { error: 'Missing required fields: name, fileType, content' },
      { status: 400 }
    )
  }

  if (!INLINE_TYPES.includes(fileType as DocumentType)) {
    return NextResponse.json(
      { error: 'upload-text only supports TEXT and MARKDOWN. Use get-upload-url for PDF/EXCEL.' },
      { status: 400 }
    )
  }

  const contentBytes = Buffer.byteLength(content, 'utf8')
  if (contentBytes > MAX_INLINE_CONTENT_SIZE) {
    return NextResponse.json(
      { error: 'Text content too large. Maximum inline size: 2MB. Save as a PDF for larger documents.' },
      { status: 400 }
    )
  }

  const dataUrl = `data:text/plain;base64,${Buffer.from(content, 'utf8').toString('base64')}`

  const document = await prisma.coachDocument.create({
    data: {
      coachId: userId,
      name: name.trim(),
      description: description?.trim() || null,
      fileType: fileType as DocumentType,
      fileUrl: dataUrl,
      fileSize: contentBytes,
      mimeType: mimeType || 'text/plain',
      processingStatus: 'PENDING',
      metadata: { rawContent: content },
    },
  })

  logger.info('Text document stored inline', { userId, documentId: document.id })

  return NextResponse.json({
    success: true,
    document,
    message: 'Document uploaded. Use "Generate" to create embeddings.',
  })
}

function inferMimeType(fileType: DocumentType): string {
  switch (fileType) {
    case 'PDF':
      return 'application/pdf'
    case 'EXCEL':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'TEXT':
      return 'text/plain'
    case 'MARKDOWN':
      return 'text/markdown'
    default:
      return 'application/octet-stream'
  }
}

// Keep ALL_TYPES for future guards / tests; prevents "unused" lint warnings.
void ALL_TYPES
