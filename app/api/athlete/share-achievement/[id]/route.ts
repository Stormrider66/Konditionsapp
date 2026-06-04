import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { SHARED_ACHIEVEMENTS_BUCKET } from '@/lib/storage/supabase-storage'

interface RouteParams {
  params: Promise<{ id: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, resolved.user.language)
    const { clientId } = resolved
    const { id } = await params

    // Check ownership
    const achievement = await prisma.sharedAchievement.findUnique({
      where: { id },
    })

    if (!achievement || achievement.clientId !== clientId) {
      return NextResponse.json({ error: t(locale, 'Not found', 'Hittades inte') }, { status: 404 })
    }

    // Delete from storage if path exists
    if (achievement.storagePath) {
      const admin = createAdminSupabaseClient()
      await admin.storage
        .from(SHARED_ACHIEVEMENTS_BUCKET)
        .remove([achievement.storagePath])
    }

    // Delete from DB
    await prisma.sharedAchievement.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting shared achievement:', error)
    return NextResponse.json(
      { error: t(locale, 'Internal server error', 'Internt serverfel') },
      { status: 500 }
    )
  }
}
