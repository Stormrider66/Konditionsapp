// app/api/clients/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clientSchema, type ClientFormData } from '@/lib/validations/schemas'
import { createClient } from '@/lib/supabase/server'
import { createAthleteAccountForClient } from '@/lib/athlete-account-utils'
import { logger } from '@/lib/logger'

// GET /api/clients - Hämta alla klienter för inloggad användare
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    const clients = await prisma.client.findMany({
      where: {
        userId: user.id,
      },
      include: {
        team: true,
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
    })

    return NextResponse.json({
      success: true,
      data: clients,
    })
  } catch (error) {
    logger.error('Error fetching clients', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch clients',
      },
      { status: 500 }
    )
  }
}

// POST /api/clients - Skapa ny klient
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

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

    // Ensure user exists in database (create if needed from Supabase Auth)
    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!dbUser) {
      // Create user record from Supabase Auth user
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.name || user.email!.split('@')[0],
          role: 'COACH', // Default role for users creating clients
          language: 'sv',
        },
      })
      logger.info('Created user record for', { email: user.email })
    }

    // Convert birthDate string to Date
    const client = await prisma.client.create({
      data: {
        userId: dbUser.id,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        gender: data.gender,
        birthDate: new Date(data.birthDate),
        height: data.height,
        weight: data.weight,
        notes: data.notes || null,
        teamId: data.teamId && data.teamId !== '' ? data.teamId : null,
      },
    })

    // Automatically create athlete account if client has an email
    let athleteAccountCreated = false
    if (client.email) {
      const athleteResult = await createAthleteAccountForClient(client.id, dbUser.id)

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
          ? 'Client and athlete account created successfully. Login credentials have been sent to the athlete\'s email.'
          : client.email
            ? 'Client created successfully (athlete account creation failed)'
            : 'Client created successfully (no email provided for athlete account)',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating client', {}, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create client',
      },
      { status: 500 }
    )
  }
}
