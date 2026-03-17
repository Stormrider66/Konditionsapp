import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { SHARED_ACHIEVEMENTS_BUCKET } from '@/lib/storage/supabase-storage'

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    const metadataStr = formData.get('metadata') as string | null

    if (!imageFile || !metadataStr) {
      return NextResponse.json({ error: 'Missing image or metadata' }, { status: 400 })
    }

    const metadata = JSON.parse(metadataStr)
    const { type, title, description, contextData } = metadata

    if (!type || !title) {
      return NextResponse.json({ error: 'Missing type or title' }, { status: 400 })
    }

    // Generate unique token
    const publicToken = randomBytes(24).toString('base64url')
    const storagePath = `${clientId}/${Date.now()}.png`

    // Upload image to Supabase Storage
    const admin = createAdminSupabaseClient()
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())

    const { error: uploadError } = await admin.storage
      .from(SHARED_ACHIEVEMENTS_BUCKET)
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    const { data: urlData } = admin.storage
      .from(SHARED_ACHIEVEMENTS_BUCKET)
      .getPublicUrl(storagePath)

    // Create DB record with 90-day expiry
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)

    const achievement = await prisma.sharedAchievement.create({
      data: {
        clientId,
        achievementType: type,
        title,
        description: description || '',
        imageUrl: urlData.publicUrl,
        storagePath,
        contextData,
        publicToken,
        publicExpiresAt: expiresAt,
      },
    })

    const publicUrl = `${request.nextUrl.origin}/achievement/${publicToken}`

    return NextResponse.json({
      id: achievement.id,
      publicUrl,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Error creating shared achievement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { clientId } = resolved

    const achievements = await prisma.sharedAchievement.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ achievements })
  } catch (error) {
    console.error('Error fetching shared achievements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
