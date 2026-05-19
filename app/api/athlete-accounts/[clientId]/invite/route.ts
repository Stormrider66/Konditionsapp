import { NextRequest, NextResponse } from 'next/server'
import { requireCoach, canAccessClient } from '@/lib/auth-utils'
import { sendAthletePlatformInvite } from '@/lib/athlete-platform-invite'
import { handleApiError } from '@/lib/api-error'

type RouteParams = {
  params: Promise<{ clientId: string }>
}

type AppLocale = 'en' | 'sv'

// POST /api/athlete-accounts/[clientId]/invite
// Resend access for an existing athlete account. The client profile email is
// the source of truth and is synced to Prisma User + Supabase Auth first.
function shouldSendEmail(value: unknown): boolean {
  return value !== 'sms' && value !== 'whatsapp' && value !== 'link'
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const coach = await requireCoach()
    const locale = getUserLocale(coach.language)
    const { clientId } = await params

    const hasAccess = await canAccessClient(coach.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this client' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const result = await sendAthletePlatformInvite(clientId, coach.id, {
      sendEmail: shouldSendEmail(body.deliveryMethod),
    })
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || t(locale, 'Could not send invite', 'Kunde inte skicka inbjudan') },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      emailSent: result.emailSent,
      emailPaused: result.emailPaused ?? false,
      email: result.email,
      inviteUrl: result.inviteUrl,
      inviteText: result.inviteText,
      businessName: result.businessName,
      syncedEmail: result.syncedEmail,
      syncedName: result.syncedName,
      message: result.emailPaused
        ? t(
            locale,
            `Outbound email is paused. Send the login link manually to ${result.email}.`,
            `Utgående e-post är pausad. Skicka inloggningslänk manuellt till ${result.email}.`
          )
        : result.emailSent
          ? t(locale, `Invite sent to ${result.email}`, `Inbjudan skickad till ${result.email}`)
          : t(locale, 'Share the invite link via SMS or WhatsApp.', 'Dela inbjudningslänken via SMS eller WhatsApp.'),
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/athlete-accounts/[clientId]/invite')
  }
}

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
