import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestedBusinessScope, requireBusinessAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { sendCoachInviteEmail } from '@/lib/email'
import { resolveEmailBranding } from '@/lib/email/branding'
import { logger } from '@/lib/logger'
import { buildRecoveryCallbackUrl } from '@/lib/url-utils'

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// POST /api/coach/admin/members/[memberId]/send-invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const admin = await requireBusinessAdminRole(getRequestedBusinessScope(request))
    const locale: AppLocale = admin.language === 'sv' ? 'sv' : 'en'
    const businessId = admin.businessId
    const { memberId } = await params

    // Find the member in this business
    const member = await prisma.businessMember.findFirst({
      where: {
        id: memberId,
        businessId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      )
    }

    const { user } = member
    const businessName = admin.business.name

    // Generate recovery link for password setup
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app'
    const supabaseAdmin = createAdminSupabaseClient()

    // Try to generate recovery link — if user doesn't exist in Supabase Auth, create them first
    let { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: user.email,
      options: {
        redirectTo: `${appUrl}/api/auth/callback?next=/reset-password`,
      },
    })

    if (linkError?.message?.includes('not found')) {
      // User exists in DB but not in Supabase Auth — create the auth account
      logger.info('Send invite: creating missing Supabase Auth account', { email: user.email })

      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        email_confirm: true,
        user_metadata: {
          name: user.name || undefined,
        },
      })

      if (createError) {
        logger.error('Send invite: failed to create auth account', { email: user.email }, createError)
        return NextResponse.json(
          { success: false, error: t(locale, 'Could not create an authentication account. Try again later.', 'Kunde inte skapa autentiseringskonto. Försök igen senare.') },
          { status: 500 }
        )
      }

      // Retry recovery link generation
      const retryResult = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: user.email,
        options: {
          redirectTo: `${appUrl}/api/auth/callback?next=/reset-password`,
        },
      })
      linkData = retryResult.data
      linkError = retryResult.error
    }

    if (linkError) {
      logger.error('Send invite: recovery link generation failed', { email: user.email }, linkError)
    }

    // Prefer our own callback URL when a hashed recovery token is available.
    const setPasswordUrl =
      buildRecoveryCallbackUrl(linkData, appUrl) || `${appUrl}/forgot-password`

    // Resend the invite — branded with the business's logo/colors and using
    // the resending admin's display name + Reply-To. Without this the email
    // leaks Trainomics platform branding even though the original (sent via
    // /api/coach/staff or inviteUserToBusiness) was business-branded.
    const emailBranding = await resolveEmailBranding(businessId, {
      senderUserId: admin.id,
    })
    const emailResult = await sendCoachInviteEmail(
      user.email,
      user.name || user.email,
      businessName,
      setPasswordUrl,
      emailBranding,
      {
        businessId,
        targetId: memberId,
      },
    ).catch((emailErr) => {
      logger.error('Send invite: failed to send email', { email: user.email }, emailErr)
      return { success: false, error: 'Email send failed' }
    })

    const emailSent = emailResult?.success ?? false

    if (!emailSent) {
      return NextResponse.json(
        { success: false, error: t(locale, 'Could not send email. Try again later.', 'Kunde inte skicka e-post. Försök igen senare.') },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      message: t(locale, `Invitation sent to ${user.email}`, `Inbjudan skickad till ${user.email}`),
    })
  } catch (error) {
    return handleApiError(error, 'POST /api/coach/admin/members/[memberId]/send-invite')
  }
}
