// app/api/clients/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from "@/lib/prisma"
import { clientSchema, type ClientFormData } from '@/lib/validations/schemas'
import { getCurrentUser, getRequestedBusinessScope } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { connectTeamMemberToCoach } from '@/lib/coach/team-connection'
import { getBusinessMembership, getWritableTeam } from '@/lib/coach/team-access'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

// GET /api/clients/[id] - Hämta specifik klient
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
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

    const { id } = await params
    const scope = getRequestedBusinessScope(request)
    const membership = await getBusinessMembership(user.id, scope.businessSlug)
    const coachIds = membership
      ? await getCoachScopedIds(user.id, membership.businessId, membership.role)
      : [user.id]
    const client = await prisma.client.findFirst({
      where: {
        id,
        ...(membership
          ? { userId: { in: coachIds }, businessId: membership.businessId }
          : { userId: user.id }),
      },
      include: {
        team: true,
        athleteAccount: {
          select: {
            id: true,
            userId: true,
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

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: 'Client not found',
        },
        { status: 404 }
      )
    }

    // Also fetch tests for this client
    const tests = await prisma.test.findMany({
      where: { clientId: id },
      include: { testStages: { orderBy: { sequence: "asc" } } },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...client,
        tests,
      },
    })
  } catch (error) {
    logger.error('Error fetching client', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch client',
      },
      { status: 500 }
    )
  }
}

// PUT /api/clients/[id] - Uppdatera klient
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
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
          error: 'Validation failed',
          details: validation.error.errors,
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
          { success: false, error: 'Team not found or unauthorized' },
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
          error: 'Client not found or unauthorized',
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
          error: 'Klienten har ett aktivt atletkonto och måste ha en e-postadress.',
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
              error: 'E-postadressen används redan av en annan användare.',
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
            error: 'Kunde inte uppdatera atletens inloggningsadress.',
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
      message: 'Client updated successfully',
    })
  } catch (error) {
    logger.error('Error updating client', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update client',
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
          error: 'Client not found or unauthorized',
        },
        { status: 404 }
      )
    }

    await prisma.client.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully',
    })
  } catch (error) {
    logger.error('Error deleting client', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete client',
      },
      { status: 500 }
    )
  }
}
