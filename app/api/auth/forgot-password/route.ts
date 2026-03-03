import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { sendPasswordResetEmail } from '@/lib/email'
import { fixLocalhostUrl } from '@/lib/url-utils'
import { rateLimitJsonResponse, getRequestIp } from '@/lib/api/rate-limit'
import { logger } from '@/lib/logger'

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

// POST /api/auth/forgot-password
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 requests per 15 minutes per IP
    const ip = getRequestIp(request)
    const rateLimited = await rateLimitJsonResponse('forgot-password', ip, {
      limit: 3,
      windowSeconds: 15 * 60,
    })
    if (rateLimited) return rateLimited

    const body = await request.json()
    const parsed = forgotPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ange en giltig e-postadress' },
        { status: 400 }
      )
    }

    const { email } = parsed.data

    // Look up user for name personalization (optional)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { name: true },
    })

    if (!user) {
      // User doesn't exist — return success anyway (no enumeration)
      return NextResponse.json({ success: true, step: 'no-user' })
    }

    // Generate recovery link via Supabase Admin
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://trainomics.app'
    const supabaseAdmin = createAdminSupabaseClient()

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${appUrl}/reset-password`,
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      logger.error('Forgot password: recovery link generation failed', { email }, linkError)
      return NextResponse.json({
        success: false,
        step: 'generate-link',
        error: linkError?.message || 'No action_link returned',
      }, { status: 500 })
    }

    // Fix localhost URLs when Supabase Site URL is misconfigured
    const resetUrl = fixLocalhostUrl(linkData.properties.action_link, appUrl)

    // Send via Resend
    const emailResult = await sendPasswordResetEmail(email, resetUrl, user.name || undefined)

    if (!emailResult.success) {
      return NextResponse.json({
        success: false,
        step: 'send-email',
        error: emailResult.error,
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, step: 'sent' })
  } catch (error) {
    logger.error('Forgot password: unexpected error', {}, error)
    return NextResponse.json({
      success: false,
      step: 'exception',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
