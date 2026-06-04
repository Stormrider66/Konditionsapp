/**
 * Single Team Member API
 *
 * PATCH  — update roster fields (jerseyNumber, position, photoUrl, email)
 * DELETE — detach client from the team (nulls Client.teamId). Does NOT
 *          disconnect the coach or delete the client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { canAccessClientInTeam, getWritableTeam } from '@/lib/coach/team-access'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ teamId: string; clientId: string }>
}

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((email) => email.toLowerCase())

export async function PATCH(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const { teamId, clientId } = await context.params

    const team = await getWritableTeam(user.id, teamId, undefined, 'roster')
    const canAccessClient = team
      ? await canAccessClientInTeam(user.id, clientId, teamId)
      : false
    if (!team || !canAccessClient) return NextResponse.json({ error: t(locale, 'notFound') }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const data: {
      jerseyNumber?: number | null
      position?: string | null
      photoUrl?: string | null
      email?: string | null
    } = {}

    if ('jerseyNumber' in body) {
      const n = body.jerseyNumber
      if (n === null || n === '' || typeof n === 'undefined') data.jerseyNumber = null
      else if (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 999) data.jerseyNumber = n
      else return NextResponse.json({ error: t(locale, 'invalidJerseyNumber') }, { status: 400 })
    }
    if ('position' in body) {
      const p = body.position
      if (p === null || p === '') data.position = null
      else if (typeof p === 'string' && p.length <= 40) data.position = p
      else return NextResponse.json({ error: t(locale, 'invalidPosition') }, { status: 400 })
    }
    if ('photoUrl' in body) {
      const u = body.photoUrl
      if (u === null || u === '') data.photoUrl = null
      else if (typeof u === 'string' && u.length <= 2048) data.photoUrl = u
      else return NextResponse.json({ error: t(locale, 'invalidPhotoUrl') }, { status: 400 })
    }
    if ('email' in body) {
      const e = body.email
      if (e === null || e === '') {
        data.email = null
      } else if (typeof e === 'string') {
        const parsedEmail = emailSchema.safeParse(e)
        if (!parsedEmail.success) {
          return NextResponse.json({ error: t(locale, 'invalidEmail') }, { status: 400 })
        }
        data.email = parsedEmail.data
      } else {
        return NextResponse.json({ error: t(locale, 'invalidEmail') }, { status: 400 })
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: t(locale, 'noValidFields') }, { status: 400 })
    }

    if ('email' in data) {
      const currentClient = await prisma.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          userId: true,
          businessId: true,
          athleteAccount: {
            select: {
              userId: true,
              user: { select: { email: true } },
            },
          },
        },
      })

      if (!currentClient) {
        return NextResponse.json({ error: t(locale, 'notFound') }, { status: 404 })
      }

      if (!data.email && currentClient.athleteAccount) {
        return NextResponse.json(
          { error: t(locale, 'activeAccountNeedsEmail') },
          { status: 400 }
        )
      }

      if (data.email) {
        const athleteAccountEmail = currentClient.athleteAccount?.user.email.toLowerCase()
        if (athleteAccountEmail && athleteAccountEmail !== data.email) {
          return NextResponse.json(
            { error: t(locale, 'updateEmailViaProfile') },
            { status: 400 }
          )
        }

        const duplicateClient = await prisma.client.findFirst({
          where: {
            id: { not: clientId },
            email: { equals: data.email, mode: 'insensitive' },
            ...(currentClient.businessId
              ? { businessId: currentClient.businessId }
              : { userId: currentClient.userId }),
          },
          select: { id: true },
        })

        if (duplicateClient) {
          return NextResponse.json(
            { error: t(locale, 'duplicatePlayerEmail') },
            { status: 409 }
          )
        }

        const duplicateUser = await prisma.user.findFirst({
          where: {
            email: { equals: data.email, mode: 'insensitive' },
            ...(currentClient.athleteAccount
              ? { id: { not: currentClient.athleteAccount.userId } }
              : {}),
          },
          select: { id: true },
        })

        if (duplicateUser) {
          return NextResponse.json(
            { error: t(locale, 'emailUsedByOtherUser') },
            { status: 409 }
          )
        }
      }
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        jerseyNumber: true,
        position: true,
        photoUrl: true,
      },
    })

    return NextResponse.json({ client: updated })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'unauthorized') }, { status: 401 })
    }
    logger.error('PATCH team member failed', {}, error)
    return NextResponse.json({ error: t(locale, 'failed') }, { status: 500 })
  }
}

function t(
  locale: AppLocale,
  key:
    | 'notFound'
    | 'invalidJerseyNumber'
    | 'invalidPosition'
    | 'invalidPhotoUrl'
    | 'invalidEmail'
    | 'noValidFields'
    | 'activeAccountNeedsEmail'
    | 'updateEmailViaProfile'
    | 'duplicatePlayerEmail'
    | 'emailUsedByOtherUser'
    | 'unauthorized'
    | 'failed'
): string {
  const sv = {
    notFound: 'Hittades inte',
    invalidJerseyNumber: 'Tröjnummer måste vara 0-999',
    invalidPosition: 'Ogiltig position',
    invalidPhotoUrl: 'Ogiltig bildadress',
    invalidEmail: 'Ogiltig e-postadress',
    noValidFields: 'Inga giltiga fält',
    activeAccountNeedsEmail: 'Spelaren har ett aktivt atletkonto och måste ha en e-postadress',
    updateEmailViaProfile: 'Uppdatera e-post via spelarprofilen för spelare med aktivt atletkonto',
    duplicatePlayerEmail: 'En spelare med denna e-postadress finns redan',
    emailUsedByOtherUser: 'E-postadressen används redan av en annan användare',
    unauthorized: 'Obehörig',
    failed: 'Misslyckades',
  }
  const en = {
    notFound: 'Not found',
    invalidJerseyNumber: 'Jersey number must be 0-999',
    invalidPosition: 'Invalid position',
    invalidPhotoUrl: 'Invalid photo URL',
    invalidEmail: 'Invalid email address',
    noValidFields: 'No valid fields',
    activeAccountNeedsEmail: 'The player has an active athlete account and must have an email address',
    updateEmailViaProfile: 'Update email through the player profile for players with an active athlete account',
    duplicatePlayerEmail: 'A player with this email address already exists',
    emailUsedByOtherUser: 'The email address is already used by another user',
    unauthorized: 'Unauthorized',
    failed: 'Failed',
  }
  return locale === 'sv' ? sv[key] : en[key]
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(req, user.language)
    const { teamId, clientId } = await context.params

    const team = await getWritableTeam(user.id, teamId, undefined, 'roster')
    const canAccessClient = team
      ? await canAccessClientInTeam(user.id, clientId, teamId)
      : false
    if (!team || !canAccessClient) return NextResponse.json({ error: t(locale, 'notFound') }, { status: 404 })

    await prisma.client.update({
      where: { id: clientId },
      data: { teamId: null },
    })

    return NextResponse.json({ detached: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: t(locale, 'unauthorized') }, { status: 401 })
    }
    logger.error('DELETE team member failed', {}, error)
    return NextResponse.json({ error: t(locale, 'failed') }, { status: 500 })
  }
}
