/**
 * Support screenshot upload API
 *
 * POST /api/support/screenshots — Upload an optional image attachment for a
 * support ticket. The object is stored in a private Supabase Storage bucket;
 * admin ticket reads generate short-lived signed URLs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth-utils'
import { getRequestIp, rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

const BUCKET = 'support-screenshots'
const MAX_BYTES = 5 * 1024 * 1024
const VALID_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

let bucketEnsured = false

async function ensureBucket() {
  if (bucketEnsured) return

  const admin = createAdminSupabaseClient()
  const { data: existing } = await admin.storage.getBucket(BUCKET)

  if (!existing) {
    const { error } = await admin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: VALID_TYPES,
    })

    if (error && !/already exists/i.test(error.message)) {
      throw new Error(`Failed to create support screenshots bucket: ${error.message}`)
    }
  }

  bucketEnsured = true
}

function extensionFor(type: string, filename: string): string {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  if (type === 'image/heic' || type === 'image/heif') return 'heic'
  if (type === 'image/jpeg' || type === 'image/jpg') return 'jpg'

  const match = filename.toLowerCase().match(/\.(jpe?g|png|webp|heic|heif)$/)
  return match ? (match[1] === 'jpeg' ? 'jpg' : match[1]) : 'jpg'
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
}

export async function POST(req: NextRequest) {
  try {
    const ip = getRequestIp(req)
    const rateLimited = await rateLimitJsonResponse('support:screenshots:post', ip, {
      limit: 10,
      windowSeconds: 3600,
    })
    if (rateLimited) return rateLimited

    const user = await getCurrentUser().catch(() => null)
    const form = await req.formData().catch(() => null)
    if (!form) {
      return NextResponse.json({ error: 'Multipart form data required' }, { status: 400 })
    }

    const screenshot = form.get('screenshot')

    if (!(screenshot instanceof File) || screenshot.size === 0) {
      return NextResponse.json({ error: 'Screenshot file required' }, { status: 400 })
    }

    if (screenshot.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Screenshot is too large. Maximum size is 5 MB.' }, { status: 413 })
    }

    const type = (screenshot.type || '').toLowerCase()
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid image format. Use JPG, PNG, WebP, HEIC, or HEIF.' }, { status: 400 })
    }

    await ensureBucket()

    const admin = createAdminSupabaseClient()
    const ext = extensionFor(type, screenshot.name)
    const owner = user?.id ? safeSegment(user.id) : `anonymous-${safeSegment(ip)}`
    const storagePath = `${owner}/${Date.now()}-${crypto.randomUUID()}.${ext}`
    const buffer = Buffer.from(await screenshot.arrayBuffer())

    const { error } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: type,
        upsert: false,
      })

    if (error) {
      logger.error('[support] Screenshot upload failed', { userId: user?.id }, error)
      return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      path: storagePath,
      fileName: screenshot.name,
      fileSize: screenshot.size,
      mimeType: type,
    })
  } catch (error) {
    logger.error('[support] Screenshot upload error', {}, error)
    return NextResponse.json({ error: 'Failed to upload screenshot' }, { status: 500 })
  }
}
