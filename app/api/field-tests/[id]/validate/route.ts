// app/api/field-tests/[id]/validate/route.ts
//
// Coach approval/rejection of a field test, consumed by the field-test
// ValidationDashboard. Sets the test's `valid` flag and appends coach notes.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireCoach, canAccessClient } from '@/lib/auth-utils'
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

type RouteParams = {
  params: Promise<{ id: string }>
}

const validateSchema = z.object({
  valid: z.boolean(),
  coachNotes: z.string().max(2000).optional(),
})

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)

    const { id } = await params
    const body = await request.json()
    const parsed = validateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: t(locale, 'Invalid validation data', 'Ogiltiga valideringsdata'), details: parsed.error.errors },
        { status: 400 }
      )
    }

    const fieldTest = await prisma.fieldTest.findUnique({
      where: { id },
      select: { id: true, clientId: true, notes: true },
    })
    if (!fieldTest) {
      return NextResponse.json(
        { error: t(locale, 'Field test not found', 'Fälttestet hittades inte') },
        { status: 404 }
      )
    }

    const hasAccess = await canAccessClient(user.id, fieldTest.clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: t(locale, 'Access denied', 'Åtkomst nekad') },
        { status: 403 }
      )
    }

    const reviewNote = parsed.data.coachNotes?.trim()
    const updated = await prisma.fieldTest.update({
      where: { id },
      data: {
        valid: parsed.data.valid,
        ...(reviewNote
          ? {
              notes: [fieldTest.notes, `${t(locale, 'Coach review', 'Tränargranskning')}: ${reviewNote}`]
                .filter(Boolean)
                .join('\n'),
            }
          : {}),
      },
      select: { id: true, valid: true, notes: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    logError('Error validating field test', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to update field test', 'Kunde inte uppdatera fälttestet') },
      { status: 500 }
    )
  }
}
