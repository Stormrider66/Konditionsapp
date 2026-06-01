// app/api/clients/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createClientSchema, type ClientFormData } from '@/lib/validations/schemas'
import { createAthleteAccountForClient } from '@/lib/athlete-account-utils'
import { getCurrentUser, getRequestedBusinessScope, hasReachedAthleteLimit } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { connectTeamMemberToCoach } from '@/lib/coach/team-connection'
import { getBusinessMembership, getWritableTeam } from '@/lib/coach/team-access'
import { getCoachScopedIds } from '@/lib/coach/scoping'

type AppLocale = 'en' | 'sv'

function resolveLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en
}

function localizeValidationDetails<T extends Array<{ message: string }>>(
  details: T,
  locale: AppLocale
): T {
  const messageMap = new Map<string, string>([
    ['Namnet måste vara minst 2 tecken', t(locale, 'Name must be at least 2 characters', 'Namnet måste vara minst 2 tecken')],
    ['Ogiltig e-postadress', t(locale, 'Invalid email address', 'Ogiltig e-postadress')],
    ['Ålder måste vara mellan 10 och 100 år', t(locale, 'Age must be between 10 and 100 years', 'Ålder måste vara mellan 10 och 100 år')],
    ['Längd måste vara minst 100 cm', t(locale, 'Height must be at least 100 cm', 'Längd måste vara minst 100 cm')],
    ['Vikt måste vara minst 30 kg', t(locale, 'Weight must be at least 30 kg', 'Vikt måste vara minst 30 kg')],
    ['Tröjnummer måste vara mellan 0 och 999', t(locale, 'Jersey number must be between 0 and 999', 'Tröjnummer måste vara mellan 0 och 999')],
  ])

  return details.map((detail) => ({
    ...detail,
    message: messageMap.get(detail.message) ?? detail.message,
  })) as T
}

// GET /api/clients - Hämta alla klienter för inloggad användare
// Supports pagination: ?limit=50&offset=0 (defaults: limit=500, offset=0)
export async function GET(request: NextRequest) {
  let locale: AppLocale = 'en'
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }
    locale = resolveLocale(user.language)

    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '500') || 500), 500)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0') || 0)
    const scope = getRequestedBusinessScope(request)
    const membership = await getBusinessMembership(user.id, scope.businessSlug)
    const coachIds = membership
      ? await getCoachScopedIds(user.id, membership.businessId, membership.role)
      : [user.id]

    const where = membership
      ? { userId: { in: coachIds }, businessId: membership.businessId }
      : { userId: user.id }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          team: true,
          sportProfile: {
            select: {
              primarySport: true,
              secondarySports: true,
            },
          },
          athleteAccount: {
            select: {
              id: true,
              user: {
                select: {
                  email: true,
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.client.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: clients,
      pagination: { total, limit, offset, hasMore: offset + clients.length < total },
    })
  } catch (error) {
    logger.error('Error fetching clients', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(
          locale,
          'Failed to fetch clients',
          'Kunde inte hämta klienter',
        ),
      },
      { status: 500 }
    )
  }
}

// POST /api/clients - Skapa ny klient
export async function POST(request: NextRequest) {
  let locale: AppLocale = 'en'
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }
    locale = resolveLocale(user.language)

    const body = await request.json()

    // Validate input
    const validation = createClientSchema(locale).safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            'Validation failed',
            'Valideringen misslyckades',
          ),
          details: localizeValidationDetails(validation.error.errors, locale),
        },
        { status: 400 }
      )
    }

    const data: ClientFormData = validation.data
    const scope = getRequestedBusinessScope(request)
    const businessMembership = await getBusinessMembership(user.id, scope.businessSlug)

    let ownerId = user.id
    const businessId = businessMembership?.businessId ?? null
    if (data.teamId) {
      const team = await getWritableTeam(user.id, data.teamId, scope.businessSlug, 'roster')
      if (!team) {
        return NextResponse.json(
          {
            success: false,
            error: t(
              locale,
              'Team not found or unauthorized',
              'Laget hittades inte eller saknar behörighet',
            ),
          },
          { status: 404 }
        )
      }
      ownerId = team.userId
    }

    // Check subscription athlete limit before creating
    // Business members are exempt — their limit is managed at the business level
    if (!businessMembership) {
      const limitReached = await hasReachedAthleteLimit(user.id)
      if (limitReached) {
        return NextResponse.json(
          {
            success: false,
            error: t(
              locale,
              'You have reached the maximum number of athletes. Upgrade your subscription to add more.',
              'Du har nått maxgränsen för antal atleter. Uppgradera din prenumeration för att lägga till fler.',
            ),
          },
          { status: 403 }
        )
      }
    }

    // Check for duplicate client with same email for this coach
    if (data.email) {
      const existingClient = await prisma.client.findFirst({
        where: {
          email: data.email,
          ...(businessId ? { businessId } : { userId: user.id }),
        },
      })

      if (existingClient) {
        return NextResponse.json(
          {
            success: false,
            error: t(
              locale,
              'A client with this email address already exists',
              'En klient med denna e-postadress finns redan',
            ),
          },
          { status: 409 }
        )
      }
    }

    // Wrap user upsert + client creation in a transaction to prevent partial state
    const { dbUser, client } = await prisma.$transaction(async (tx) => {
      // Ensure user exists in database
      let txUser = await tx.user.findUnique({
        where: { id: user.id },
      })

      if (!txUser) {
        // Defensive fallback for rare races; should usually already exist via getCurrentUser().
        txUser = await tx.user.create({
          data: {
            id: user.id,
            email: user.email,
            name: user.name || user.email.split('@')[0],
            role: 'COACH', // Default role for users creating clients
            language: user.language || 'en',
          },
        })
        logger.info('Created user record for', { email: user.email })
      }

      // Convert birthDate string to Date
      const txClient = await tx.client.create({
        data: {
          userId: ownerId,
          businessId,
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          gender: data.gender,
          birthDate: new Date(data.birthDate),
          height: data.height,
          weight: data.weight,
          notes: data.notes || null,
          teamId: data.teamId && data.teamId !== '' ? data.teamId : null,
          jerseyNumber: data.jerseyNumber ?? null,
          position: data.position ? data.position : null,
          photoUrl: data.photoUrl ? data.photoUrl : null,
        },
      })

      return { dbUser: txUser, client: txClient }
    })

    // Auto-connect to team coach if client was assigned a team
    if (client.teamId) {
      try {
        await connectTeamMemberToCoach(client.id, client.teamId, {
          assignedByUserId: dbUser.id,
          businessId: businessId ?? undefined,
        })
      } catch (err) {
        logger.warn('Team auto-connection failed', { clientId: client.id, teamId: client.teamId, error: err })
      }
    }

    // Automatically create athlete account if client has an email
    let athleteAccountCreated = false
    if (client.email) {
      const athleteResult = await createAthleteAccountForClient(client.id, dbUser.id, {
        tier: data.athleteTier,
      })

      if (athleteResult.success) {
        athleteAccountCreated = true
        logger.info('Athlete account created automatically for client', { clientName: client.name })
      } else {
        logger.warn('Could not create athlete account automatically', { error: athleteResult.error })
        // Don't fail the whole request if athlete account creation fails
      }
    }

    // SECURITY: Never return passwords in API responses
    // Credentials are sent via email only
    return NextResponse.json(
      {
        success: true,
        data: client,
        athleteAccountCreated, // Boolean flag instead of credentials
        message: athleteAccountCreated
          ? t(
              locale,
              'Client and athlete account created successfully. Login credentials have been sent to the athlete\'s email.',
              'Klient och atletkonto har skapats. Inloggningsuppgifter har skickats till atletens e-post.',
            )
          : client.email
            ? t(
                locale,
                'Client created successfully (athlete account creation failed)',
                'Klienten har skapats (atletkontot kunde inte skapas)',
              )
            : t(
                locale,
                'Client created successfully (no email provided for athlete account)',
                'Klienten har skapats (ingen e-post angavs för atletkonto)',
              ),
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating client', {}, error)

    // Return specific error messages for known Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[])?.join(', ') || 'unknown'
        return NextResponse.json(
          {
            success: false,
            error: t(
              locale,
              `A record with the same value already exists (${target}). Check the email address.`,
              `En post med samma värde finns redan (${target}). Kontrollera e-postadressen.`,
            ),
          },
          { status: 409 }
        )
      }
      if (error.code === 'P2003') {
        return NextResponse.json(
          {
            success: false,
            error: t(
              locale,
              'Reference error: a related object (team or business) was not found.',
              'Referensfel: ett relaterat objekt (lag eller verksamhet) hittades inte.',
            ),
          },
          { status: 400 }
        )
      }
      if (error.code === 'P2025') {
        return NextResponse.json(
          {
            success: false,
            error: t(
              locale,
              'The user account could not be found. Try logging out and in again.',
              'Användarkontot kunde inte hittas. Försök logga ut och in igen.',
            ),
          },
          { status: 404 }
        )
      }
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            'The database connection failed. Try again in a moment.',
            'Databasanslutningen misslyckades. Försök igen om en stund.',
          ),
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: t(
          locale,
          'Could not create the client. Try again or contact support.',
          'Kunde inte skapa klienten. Försök igen eller kontakta support.',
        ),
      },
      { status: 500 }
    )
  }
}
