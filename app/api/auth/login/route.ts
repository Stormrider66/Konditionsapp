import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimitJsonResponse, getRequestIp } from '@/lib/api/rate-limit'
import { logAuthEvent } from '@/lib/auth/auth-events'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(1024),
})

const LOGIN_IP_LIMIT = {
  limit: 10,
  windowSeconds: 60,
}

const LOGIN_EMAIL_LIMIT = {
  limit: 6,
  windowSeconds: 15 * 60,
}

export async function POST(request: NextRequest) {
  const ip = getRequestIp(request)

  try {
    const ipLimited = await rateLimitJsonResponse('auth:login:ip', ip, LOGIN_IP_LIMIT)
    if (ipLimited) return ipLimited

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 })
    }

    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 })
    }

    const { email, password } = parsed.data
    const emailLimited = await rateLimitJsonResponse('auth:login:email', email, LOGIN_EMAIL_LIMIT)
    if (emailLimited) return emailLimited

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      await logAuthEvent({
        eventType: 'LOGIN_FAILURE',
        email,
        failureReason: error.message.slice(0, 200),
        ipAddress: ip,
        userAgent: request.headers.get('user-agent'),
      })

      return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 })
    }

    await logAuthEvent({
      eventType: 'LOGIN_SUCCESS',
      userId: data.user?.id,
      email,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[auth/login] Failed to process login', {}, error)
    return NextResponse.json({ error: 'LOGIN_FAILED' }, { status: 500 })
  }
}
