/**
 * Coach Dashboard Template item operations.
 * DELETE /api/coach/dashboard-templates/:id
 */

import { NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

type AppLocale = 'en' | 'sv'

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireCoach()
  const locale = getUserLocale(user.language)
  const { id } = await params

  const template = await prisma.coachDashboardTemplate.findUnique({
    where: { id },
    select: { businessId: true },
  })
  if (!template) {
    return NextResponse.json({ error: t(locale, 'Not found', 'Hittades inte') }, { status: 404 })
  }

  // Verify coach belongs to the business this template lives in
  const membership = await prisma.businessMember.findFirst({
    where: { businessId: template.businessId, userId: user.id, isActive: true },
  })
  if (!membership) {
    return NextResponse.json({ error: t(locale, 'Forbidden', 'Saknar behörighet') }, { status: 403 })
  }

  await prisma.coachDashboardTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
