// app/api/field-tests/schedule/[id]/remind/route.ts
//
// Sends an email reminder to the athlete about a scheduled field test and
// marks the schedule row. Consumed by the coach field-test SchedulePage.
// (Outbound email respects the global EMAILS_PAUSED kill switch inside
// lib/email; the schedule row is still marked so the coach sees it as sent.)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach, canAccessClient } from '@/lib/auth-utils'
import { sendEmail } from '@/lib/email'
import { logError } from '@/lib/logger-console'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

type RouteParams = {
  params: Promise<{ id: string }>
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)

    const { id } = await params
    const schedule = await prisma.fieldTestSchedule.findUnique({
      where: { id },
      select: {
        id: true,
        clientId: true,
        testType: true,
        scheduledDate: true,
        completed: true,
      },
    })
    if (!schedule) {
      return NextResponse.json(
        { error: t(locale, 'Scheduled test not found', 'Det schemalagda testet hittades inte') },
        { status: 404 }
      )
    }

    const hasAccess = await canAccessClient(user.id, schedule.clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: t(locale, 'Access denied', 'Åtkomst nekad') },
        { status: 403 }
      )
    }

    if (schedule.completed) {
      return NextResponse.json(
        { error: t(locale, 'Test is already completed', 'Testet är redan genomfört') },
        { status: 400 }
      )
    }

    const client = await prisma.client.findUnique({
      where: { id: schedule.clientId },
      select: {
        name: true,
        email: true,
        athleteAccount: { select: { user: { select: { email: true, language: true } } } },
      },
    })
    const recipient = client?.athleteAccount?.user?.email || client?.email
    if (!recipient) {
      return NextResponse.json(
        { error: t(locale, 'Athlete has no email address', 'Atleten saknar e-postadress') },
        { status: 400 }
      )
    }

    const athleteLocale: AppLocale = client?.athleteAccount?.user?.language === 'sv' ? 'sv' : 'en'
    const dateStr = schedule.scheduledDate.toLocaleDateString(
      athleteLocale === 'sv' ? 'sv-SE' : 'en-US',
      { weekday: 'long', day: 'numeric', month: 'long' }
    )
    const subject = t(
      athleteLocale,
      `Reminder: ${schedule.testType} field test on ${dateStr}`,
      `Påminnelse: ${schedule.testType} fälttest ${dateStr}`
    )
    const html = `
      <p>${t(athleteLocale, `Hi ${client?.name ?? ''},`, `Hej ${client?.name ?? ''},`)}</p>
      <p>${t(
        athleteLocale,
        `This is a reminder that you have a <strong>${schedule.testType}</strong> field test scheduled for <strong>${dateStr}</strong>.`,
        `Det här är en påminnelse om att du har ett <strong>${schedule.testType}</strong>-fälttest inplanerat <strong>${dateStr}</strong>.`
      )}</p>
      <p>${t(
        athleteLocale,
        'Make sure you are rested and prepared. Good luck!',
        'Se till att vara utvilad och förberedd. Lycka till!'
      )}</p>
    `

    await sendEmail({ to: recipient, subject, html })

    await prisma.fieldTestSchedule.update({
      where: { id },
      data: { reminderSent: true, reminderDate: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logError('Error sending field test reminder', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to send reminder', 'Kunde inte skicka påminnelse') },
      { status: 500 }
    )
  }
}
