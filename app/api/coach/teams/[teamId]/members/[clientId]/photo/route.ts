/**
 * Per-player photo upload.
 *
 * POST   — multipart/form-data with `photo` file. Uploads to the public
 *          `client-photos` bucket under `{clientId}/{timestamp}.{ext}` and
 *          writes the public URL to Client.photoUrl.
 * DELETE — clears Client.photoUrl (the object stays in storage; cleanup
 *          is eventual via the existing storage janitor, if any).
 *
 * Auth: coach must own the team AND the client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { canAccessClientInTeam, getWritableTeam } from '@/lib/coach/team-access'

export const runtime = 'nodejs'

const BUCKET = 'client-photos'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB — plenty for a headshot
const VALID_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

interface RouteContext {
  params: Promise<{ teamId: string; clientId: string }>
}
type AppLocale = 'en' | 'sv'

let bucketEnsured = false
async function ensureBucket() {
  if (bucketEnsured) return
  const admin = createAdminSupabaseClient()
  const { data: existing } = await admin.storage.getBucket(BUCKET)
  if (!existing) {
    const { error } = await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: VALID_TYPES,
    })
    if (error && !/already exists/i.test(error.message)) {
      throw new Error(`Failed to create bucket: ${error.message}`)
    }
  }
  bucketEnsured = true
}

function extensionFor(type: string, filename: string): string {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  if (type === 'image/heic' || type === 'image/heif') return 'heic'
  if (type === 'image/jpeg' || type === 'image/jpg') return 'jpg'
  const m = filename.toLowerCase().match(/\.(jpe?g|png|webp|heic|heif)$/)
  return m ? (m[1] === 'jpeg' ? 'jpg' : m[1]) : 'jpg'
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const locale: AppLocale = user.language === 'sv' ? 'sv' : 'en'
    const { teamId, clientId } = await context.params

    const team = await getWritableTeam(user.id, teamId, undefined, 'roster')
    const canAccessClient = team
      ? await canAccessClientInTeam(user.id, clientId, teamId)
      : false
    if (!team || !canAccessClient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const form = await req.formData()
    const photo = form.get('photo')
    if (!(photo instanceof File) || photo.size === 0) {
      return NextResponse.json({ error: 'Photo file required' }, { status: 400 })
    }
    if (photo.size > MAX_BYTES) {
      return NextResponse.json(
        { error: t(locale, `Image is too large. Max ${MAX_BYTES / (1024 * 1024)} MB.`, `För stor bild. Max ${MAX_BYTES / (1024 * 1024)} MB.`) },
        { status: 413 }
      )
    }
    const type = (photo.type || '').toLowerCase()
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: t(locale, 'Invalid format. Use JPG, PNG, WebP, or HEIC.', 'Ogiltigt format. JPG, PNG, WebP eller HEIC.') },
        { status: 400 }
      )
    }

    await ensureBucket()

    const admin = createAdminSupabaseClient()
    const ext = extensionFor(type, photo.name)
    const storagePath = `${clientId}/${Date.now()}.${ext}`
    const buf = Buffer.from(await photo.arrayBuffer())

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, buf, { contentType: type, upsert: true })
    if (upErr) {
      logger.error('Client photo upload failed', { clientId }, upErr)
      return NextResponse.json(
        { error: t(locale, `Upload failed: ${upErr.message}`, `Uppladdning misslyckades: ${upErr.message}`) },
        { status: 500 }
      )
    }

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath)
    const photoUrl = urlData.publicUrl

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: { photoUrl },
      select: { id: true, photoUrl: true },
    })

    return NextResponse.json({ client: updated })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('POST client photo failed', {}, error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId, clientId } = await context.params

    const team = await getWritableTeam(user.id, teamId, undefined, 'roster')
    const canAccessClient = team
      ? await canAccessClientInTeam(user.id, clientId, teamId)
      : false
    if (!team || !canAccessClient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.client.update({
      where: { id: clientId },
      data: { photoUrl: null },
    })

    return NextResponse.json({ cleared: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('DELETE client photo failed', {}, error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
