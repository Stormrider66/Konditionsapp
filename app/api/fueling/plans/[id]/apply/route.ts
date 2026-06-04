import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { refreshFuelingPrescriptionsForActivePrograms } from '@/lib/fueling/workout-prescriptions'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    locale = resolveRequestLocale(request, user.language)

    const { id } = await params
    const plan = await prisma.raceFuelingPlan.findUnique({
      where: { id },
      select: { id: true, clientId: true },
    })
    if (!plan) return NextResponse.json({ error: t(locale, 'Plan not found', 'Planen hittades inte') }, { status: 404 })

    const hasAccess = await canAccessClient(user.id, plan.clientId)
    if (!hasAccess) return NextResponse.json({ error: t(locale, 'Plan not found', 'Planen hittades inte') }, { status: 404 })

    const updatedCount = await refreshFuelingPrescriptionsForActivePrograms(prisma, plan.clientId, plan.id)
    return NextResponse.json({ success: true, updatedCount })
  } catch (error) {
    logger.error('Error applying fueling plan to workouts', {}, error as Error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
