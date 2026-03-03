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

    // Always return success to prevent email enumeration
    const successResponse = () => NextResponse.json({ success: true })

    // Look up user for name personalization (optional)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { name: true },
    })

    if (!user) {
      // User doesn't exist — return success anyway (no enumeration)
      return successResponse()
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
      return successResponse()
    }

    // Fix localhost URLs when Supabase Site URL is misconfigured
    const resetUrl = fixLocalhostUrl(linkData.properties.action_link, appUrl)

    // Send via Resend
    await sendPasswordResetEmail(email, resetUrl, user.name || undefined).catch((err) => {
      logger.error('Forgot password: email send failed', { email }, err)
    })

    return successResponse()
  } catch (error) {
    logger.error('Forgot password: unexpected error', {}, error)
    // Still return success to prevent information leakage
    return NextResponse.json({ success: true })
  }
}
