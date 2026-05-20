// app/api/coach/tests/[testId]/send-result/route.ts
//
// Trigger: coach clicks "Send result" on a finished test.
// Behaviour: creates an athlete account on-demand (FREE tier) if missing,
// emails the athlete a deep link to their result, and returns a status
// payload. The actual heavy lifting lives in lib/email/send-test-result-invite.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { sendTestResultInvite } from '@/lib/email/send-test-result-invite'
import { logger } from '@/lib/logger'

const bodySchema = z.object({
  message: z.string().max(2000).optional(),
})

interface RouteContext {
  params: Promise<{ testId: string }>
}

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const coach = await requireCoach()
    const locale: AppLocale = coach.language === 'sv' ? 'sv' : 'en'
    const { testId } = await context.params

    const body = await request.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    // Authorization: the coach must either own the test directly, or be a
    // business member of the same business as the test's client. Mirrors the
    // canAccessClient pattern but inlined here because we need both checks
    // without two roundtrips.
    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: {
        userId: true,
        client: {
          select: { businessId: true },
        },
      },
    })

    if (!test) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Test not found', 'Testet hittades inte') },
        { status: 404 },
      )
    }

    let authorized = test.userId === coach.id
    if (!authorized && test.client.businessId) {
      const membership = await prisma.businessMember.findFirst({
        where: {
          userId: coach.id,
          businessId: test.client.businessId,
          isActive: true,
        },
        select: { id: true },
      })
      authorized = !!membership
    }

    if (!authorized) {
      return NextResponse.json(
        { success: false, error: t(locale, 'You do not have access to this test', 'Du har inte behörighet till det här testet') },
        { status: 403 },
      )
    }

    const result = await sendTestResultInvite({
      testId,
      coachUserId: coach.id,
      message: parsed.data.message,
      locale,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || t(locale, 'Could not send result email', 'Kunde inte skicka resultatmejl') },
        { status: 400 },
      )
    }

    logger.info('Test result invite sent', {
      testId,
      coachId: coach.id,
      athleteAccountCreated: result.athleteAccountCreated,
      emailSent: result.emailSent,
    })

    return NextResponse.json({
      success: true,
      athleteAccountCreated: result.athleteAccountCreated,
      emailSent: result.emailSent,
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/coach/tests/[testId]/send-result')
  }
}
