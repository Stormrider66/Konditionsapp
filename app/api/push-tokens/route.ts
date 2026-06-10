// app/api/push-tokens/route.ts
//
// POST   — register/refresh a device push token for the current user.
// DELETE — unregister a token (logout, notification opt-out).
//
// Called by the native app at login / token rotation. Tokens drive the chat
// push fan-out in lib/chat/push.ts. (docs/TEAM_CHAT_DESIGN.md, slice 3)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const registerSchema = z.object({
  token: z.string().min(10).max(200),
  platform: z.enum(['ios', 'android', 'web']),
  provider: z.string().min(1).max(40).default('expo'),
})

const unregisterSchema = z.object({
  token: z.string().min(10).max(200),
})

export async function POST(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const data = registerSchema.parse(await request.json())

    // Upsert by token: a device that changes owner (shared device, re-login)
    // must end up attached to the current user only.
    const pushToken = await prisma.devicePushToken.upsert({
      where: { token: data.token },
      update: { userId: user.id, platform: data.platform, provider: data.provider, lastSeenAt: new Date() },
      create: { userId: user.id, token: data.token, platform: data.platform, provider: data.provider },
    })

    return NextResponse.json({ id: pushToken.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error registering push token:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to register push token', 'Kunde inte registrera pushtoken') },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, user.language)

    const data = unregisterSchema.parse(await request.json())

    await prisma.devicePushToken.deleteMany({
      where: { token: data.token, userId: user.id },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error unregistering push token:', error)
    return NextResponse.json(
      { error: t(locale, 'Failed to remove push token', 'Kunde inte ta bort pushtoken') },
      { status: 500 }
    )
  }
}
