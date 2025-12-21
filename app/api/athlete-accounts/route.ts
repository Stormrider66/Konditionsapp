// app/api/athlete-accounts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { requireCoach, hasReachedAthleteLimit, canAccessClient } from '@/lib/auth-utils'
import { CreateAthleteAccountDTO } from '@/types'
import { logger } from '@/lib/logger'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

/**
 * POST /api/athlete-accounts
 * Create a new athlete account for a client
 * Only coaches can create athlete accounts
 */
export async function POST(request: NextRequest) {
  try {
    // Require coach authentication
    const coach = await requireCoach()

    // Check subscription limits
    const reachedLimit = await hasReachedAthleteLimit(coach.id)
    if (reachedLimit) {
      return NextResponse.json(
        { error: 'You have reached your athlete limit. Please upgrade your subscription.' },
        { status: 403 }
      )
    }

    const body: CreateAthleteAccountDTO = await request.json()
    const { clientId, email, temporaryPassword, notificationPrefs } = body

    // Validate required fields
    if (!clientId || !email) {
      return NextResponse.json(
        { error: 'Client ID and email are required' },
        { status: 400 }
      )
    }

    // Check if coach has access to this client
    const hasAccess = await canAccessClient(coach.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this client' },
        { status: 403 }
      )
    }

    // Check if client already has an athlete account
    const existingAccount = await prisma.athleteAccount.findUnique({
      where: { clientId },
    })

    if (existingAccount) {
      return NextResponse.json(
        { error: 'This client already has an athlete account' },
        { status: 400 }
      )
    }

    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already in use' },
        { status: 400 }
      )
    }

    // Get client details for athlete user name
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Generate temporary password if not provided
    const password = temporaryPassword || generateTemporaryPassword()

    // Create user account in Supabase using service role for admin operations
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: client.name,
        role: 'ATHLETE',
      },
    })

    if (authError || !authData.user) {
      logger.error('Supabase auth error', { email, clientId }, authError)
      return NextResponse.json(
        { error: `Failed to create athlete account: ${authError?.message}` },
        { status: 500 }
      )
    }

    // Create user in our database
    const athleteUser = await prisma.user.create({
      data: {
        id: authData.user.id,
        email: email,
        name: client.name,
        role: 'ATHLETE',
        language: coach.language, // Inherit coach's language
      },
    })

    // Create athlete account linking
    const athleteAccount = await prisma.athleteAccount.create({
      data: {
        clientId,
        userId: athleteUser.id,
        notificationPrefs: notificationPrefs || {
          email: true,
          push: false,
          workoutReminders: true,
        },
      },
      include: {
        client: true,
        user: true,
      },
    })

    // Update subscription athlete count
    await prisma.subscription.update({
      where: { userId: coach.id },
      data: {
        currentAthletes: {
          increment: 1,
        },
      },
    })

    // Send welcome email with temporary password
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Konditionstest <noreply@konditionstest.se>',
          to: email,
          subject: 'Välkommen till Konditionstest - Ditt atletkonto är skapat',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #1a1a1a;">Välkommen till Konditionstest!</h1>
              <p>Hej ${client.name},</p>
              <p>Din tränare har skapat ett atletkonto åt dig. Nu kan du logga in och se dina träningsprogram, logga pass och följa din utveckling.</p>
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>E-post:</strong> ${email}</p>
                <p style="margin: 0;"><strong>Temporärt lösenord:</strong> ${password}</p>
              </div>
              <p style="color: #666;">Vi rekommenderar att du ändrar ditt lösenord efter första inloggningen.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://konditionstest.se'}/login"
                 style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
                Logga in
              </a>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Om du har frågor, kontakta din tränare direkt.
              </p>
            </div>
          `,
        })
        logger.info('Welcome email sent', { email, clientId })
      } catch (emailError) {
        logger.error('Failed to send welcome email', { email, clientId }, emailError)
        // Don't fail the request if email fails - account is still created
      }
    }

    return NextResponse.json(
      {
        athleteAccount,
        temporaryPassword: password,
        message: 'Athlete account created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating athlete account', {}, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/athlete-accounts?clientId=xxx
 * Get athlete account for a client
 */
export async function GET(request: NextRequest) {
  try {
    const coach = await requireCoach()
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Check access
    const hasAccess = await canAccessClient(coach.id, clientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this client' },
        { status: 403 }
      )
    }

    const athleteAccount = await prisma.athleteAccount.findUnique({
      where: { clientId },
      include: {
        client: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            language: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(athleteAccount)
  } catch (error) {
    logger.error('Error fetching athlete account', {}, error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate a random temporary password
 */
function generateTemporaryPassword(): string {
  const length = 12
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}
