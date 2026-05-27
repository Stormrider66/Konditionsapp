// app/api/clients/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from "@/lib/prisma"
import { clientSchema, type ClientFormData } from '@/lib/validations/schemas'
import { getCurrentUser, getRequestedBusinessScope } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { connectTeamMemberToCoach } from '@/lib/coach/team-connection'
import { getAccessibleTeam, getBusinessMembership, getWritableTeam } from '@/lib/coach/team-access'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

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

// GET /api/clients/[id] - Hämta specifik klient
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
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

    const { id } = await params
    const scope = getRequestedBusinessScope(request)
    const membership = await getBusinessMembership(user.id, scope.businessSlug)
    const coachIds = membership
      ? await getCoachScopedIds(user.id, membership.businessId, membership.role)
      : [user.id]
    let client = await prisma.client.findFirst({
      where: {
        id,
        ...(membership
          ? {
              userId: { in: coachIds },
              OR: [
                { businessId: membership.businessId },
                ...(scope.businessSlug
                  ? [{ team: { organization: { id: `${scope.businessSlug}-org` } } }]
                  : []),
              ],
            }
          : { userId: user.id }),
      },
      include: {
        team: true,
        athleteAccount: {
          select: {
            id: true,
            userId: true,
            createdAt: true,
            user: {
              select: {
                email: true,
                createdAt: true,
              }
            }
          }
        }
      },
    })

    if (!client && membership && scope.businessSlug) {
      const candidate = await prisma.client.findFirst({
        where: {
          id,
          userId: { in: coachIds },
          teamId: { not: null },
        },
        include: {
          team: true,
          athleteAccount: {
            select: {
              id: true,
              userId: true,
              createdAt: true,
              user: {
                select: {
                  email: true,
                  createdAt: true,
                }
              }
            }
          }
        },
      })

      if (candidate?.teamId && await getAccessibleTeam(user.id, candidate.teamId, scope.businessSlug)) {
        client = candidate
      }
    }

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            'Client not found',
            'Klienten hittades inte',
          ),
        },
        { status: 404 }
      )
    }

    // Recover rows created through older roster-import paths that attached the
    // player to the correct business team but did not stamp client.businessId.
    if (membership && client.businessId !== membership.businessId) {
      client = await prisma.client.update({
        where: { id: client.id },
        data: { businessId: membership.businessId },
        include: {
          team: true,
          athleteAccount: {
            select: {
              id: true,
              userId: true,
              createdAt: true,
              user: {
                select: {
                  email: true,
                  createdAt: true,
                }
              }
            }
          }
        },
      })
    }

    const authStatusPromise = client.athleteAccount
      ? getAthletePortalStatus(client.athleteAccount.userId)
      : Promise.resolve(null)

    // Also fetch tests for this client
    const [tests, athletePortalStatus] = await Promise.all([
      prisma.test.findMany({
        where: { clientId: id },
        include: { testStages: { orderBy: { sequence: "asc" } } },
      }),
      authStatusPromise,
    ])

    return NextResponse.json({
      success: true,
      data: {
        ...client,
        athleteAccount: client.athleteAccount
          ? {
              ...client.athleteAccount,
              authStatus: athletePortalStatus,
            }
          : null,
        tests,
      },
    })
  } catch (error) {
    logger.error('Error fetching client', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(
          locale,
          'Failed to fetch client',
          'Kunde inte hämta klienten',
        ),
      },
      { status: 500 }
    )
  }
}

async function getAthletePortalStatus(userId: string) {
  const [lastPasswordReset, lastLogin, authUserResult] = await Promise.all([
    prisma.authEvent.findFirst({
      where: { userId, eventType: 'PASSWORD_RESET' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.authEvent.findFirst({
      where: { userId, eventType: 'LOGIN_SUCCESS' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    getSupabaseAuthUser(userId),
  ])

  const authUser = authUserResult?.data?.user ?? null
  const authLastSignInAt = authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at) : null
  const lastSignInAt = authLastSignInAt ?? lastLogin?.createdAt ?? null
  const passwordUpdatedAt = lastPasswordReset?.createdAt ?? null
  const hasLoggedIn = !!lastSignInAt
  const bannedUntil = (authUser as { banned_until?: string | null } | null)?.banned_until
  const hasSetPasswordAndLoggedIn = !!(
    passwordUpdatedAt &&
    lastSignInAt &&
    lastSignInAt >= passwordUpdatedAt
  )

  return {
    isActive: !!authUser && !bannedUntil && hasLoggedIn,
    hasLoggedIn,
    hasSetPasswordAndLoggedIn,
    lastSignInAt: lastSignInAt?.toISOString() ?? null,
    passwordUpdatedAt: passwordUpdatedAt?.toISOString() ?? null,
  }
}

async function getSupabaseAuthUser(userId: string) {
  try {
    return await createAdminSupabaseClient().auth.admin.getUserById(userId)
  } catch (error) {
    logger.warn('Unable to fetch athlete auth status', { userId }, error)
    return null
  }
}

// PUT /api/clients/[id] - Uppdatera klient
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
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

    const { id } = await params
    const scope = getRequestedBusinessScope(request)
    const membership = await getBusinessMembership(user.id, scope.businessSlug)
    const coachIds = membership
      ? await getCoachScopedIds(user.id, membership.businessId, membership.role)
      : [user.id]
    const body = await request.json()

    // Validate input
    const validation = clientSchema.safeParse(body)
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
    let teamOwnerId: string | undefined
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
      teamOwnerId = team.userId
    }

    const profileEmail = data.email?.trim() ? data.email.trim().toLowerCase() : undefined

    // Convert birthDate string to Date
    const updateData = {
      ...(teamOwnerId ? { userId: teamOwnerId } : {}),
      name: data.name,
      email: profileEmail,
      phone: data.phone || undefined,
      gender: data.gender,
      birthDate: new Date(data.birthDate),
      height: data.height,
      weight: data.weight,
      notes: data.notes || undefined,
      teamId: data.teamId && data.teamId !== '' ? data.teamId : null,
    }

    // Check ownership before updating
    const existingClient = await prisma.client.findUnique({
      where: { id },
      include: {
        athleteAccount: {
          select: {
            userId: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
      },
    })

    const canAccessClient = existingClient && (
      membership
        ? existingClient.businessId === membership.businessId && coachIds.includes(existingClient.userId)
        : existingClient.userId === user.id
    )

    if (!canAccessClient) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            'Client not found or unauthorized',
            'Klienten hittades inte eller saknar behörighet',
          ),
        },
        { status: 404 }
      )
    }

    const athleteUser = existingClient.athleteAccount?.user
    const shouldSyncAthleteEmail = Boolean(
      athleteUser &&
      profileEmail &&
      athleteUser.email.toLowerCase() !== profileEmail
    )
    const shouldSyncAthleteName = Boolean(
      athleteUser &&
      athleteUser.name !== data.name
    )

    if (athleteUser && !profileEmail) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            'The client has an active athlete account and must have an email address.',
            'Klienten har ett aktivt atletkonto och måste ha en e-postadress.',
          ),
        },
        { status: 400 }
      )
    }

    if (athleteUser && profileEmail && (shouldSyncAthleteEmail || shouldSyncAthleteName)) {
      if (shouldSyncAthleteEmail) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email: { equals: profileEmail, mode: 'insensitive' },
            id: { not: existingClient.athleteAccount!.userId },
          },
          select: { id: true },
        })

        if (existingUser) {
          return NextResponse.json(
            {
              success: false,
              error: t(
                locale,
                'The email address is already used by another user.',
                'E-postadressen används redan av en annan användare.',
              ),
            },
            { status: 409 }
          )
        }
      }

      const supabaseAdmin = createAdminSupabaseClient()
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        existingClient.athleteAccount!.userId,
        {
          ...(shouldSyncAthleteEmail ? { email: profileEmail, email_confirm: true } : {}),
          user_metadata: {
            name: data.name,
            role: 'ATHLETE',
          },
        },
      )

      if (authError) {
        logger.error('Failed to sync athlete profile email in Supabase Auth', {
          clientId: id,
          userId: existingClient.athleteAccount!.userId,
          email: profileEmail,
        }, authError)
        return NextResponse.json(
          {
            success: false,
            error: t(
              locale,
              "Could not update the athlete's login email address.",
              'Kunde inte uppdatera atletens inloggningsadress.',
            ),
          },
          { status: 500 }
        )
      }
    }

    let client
    try {
      client = await prisma.$transaction(async (tx) => {
        const updatedClient = await tx.client.update({ where: { id }, data: updateData })

        if (athleteUser && profileEmail && (shouldSyncAthleteEmail || shouldSyncAthleteName)) {
          await tx.user.update({
            where: { id: existingClient.athleteAccount!.userId },
            data: {
              email: profileEmail,
              name: data.name,
            },
          })
        }

        return updatedClient
      })
    } catch (txError) {
      if (athleteUser && shouldSyncAthleteEmail) {
        await createAdminSupabaseClient().auth.admin.updateUserById(
          existingClient.athleteAccount!.userId,
          {
            email: athleteUser.email,
            email_confirm: true,
          },
        ).catch((rollbackError) => {
          logger.error('Failed to roll back athlete auth email after client update failure', {
            clientId: id,
            userId: existingClient.athleteAccount!.userId,
            email: athleteUser.email,
          }, rollbackError)
        })
      }

      throw txError
    }

    // Auto-connect to team coach if teamId changed to a new team
    const newTeamId = updateData.teamId
    if (newTeamId && newTeamId !== existingClient.teamId) {
      try {
        await connectTeamMemberToCoach(client.id, newTeamId, {
          assignedByUserId: user.id,
          businessId: membership?.businessId ?? existingClient.businessId ?? undefined,
        })
      } catch (err) {
        logger.warn('Team auto-connection failed on update', { clientId: client.id, teamId: newTeamId, error: err })
      }
    }

    return NextResponse.json({
      success: true,
      data: client,
      message: t(
        locale,
        'Client updated successfully',
        'Klienten har uppdaterats',
      ),
    })
  } catch (error) {
    logger.error('Error updating client', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(
          locale,
          'Failed to update client',
          'Kunde inte uppdatera klienten',
        ),
      },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id] - Ta bort klient
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
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

    const { id } = await params
    const scope = getRequestedBusinessScope(request)
    const membership = await getBusinessMembership(user.id, scope.businessSlug)
    const coachIds = membership
      ? await getCoachScopedIds(user.id, membership.businessId, membership.role)
      : [user.id]

    // Check ownership before deleting
    const existingClient = await prisma.client.findUnique({
      where: { id },
    })

    const canAccessClient = existingClient && (
      membership
        ? existingClient.businessId === membership.businessId && coachIds.includes(existingClient.userId)
        : existingClient.userId === user.id
    )

    if (!canAccessClient) {
      return NextResponse.json(
        {
          success: false,
          error: t(
            locale,
            'Client not found or unauthorized',
            'Klienten hittades inte eller saknar behörighet',
          ),
        },
        { status: 404 }
      )
    }

    await prisma.client.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: t(
        locale,
        'Client deleted successfully',
        'Klienten har tagits bort',
      ),
    })
  } catch (error) {
    logger.error('Error deleting client', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: t(
          locale,
          'Failed to delete client',
          'Kunde inte ta bort klienten',
        ),
      },
      { status: 500 }
    )
  }
}
