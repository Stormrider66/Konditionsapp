// app/api/clients/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clientSchema } from '@/lib/validations/schemas'
import { createClient } from '@/lib/supabase/server'
import type { CreateClientDTO } from '@/types'

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
    console.error('Error fetching clients:', error)
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

    const data = validation.data as CreateClientDTO

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
      console.log('Created user record for:', user.email)
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
        teamId: (data as any).teamId ? (data as any).teamId : null,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: client,
        message: 'Client created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create client',
      },
      { status: 500 }
    )
  }
}
