// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()

    if (!supabaseUser || !supabaseUser.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json().catch(() => ({} as any))
    const requestedName =
      body && typeof body === 'object' && typeof body.name === 'string'
        ? body.name.trim()
        : ''

    const nameFromMetadata =
      (supabaseUser.user_metadata &&
        typeof supabaseUser.user_metadata === 'object' &&
        'name' in supabaseUser.user_metadata &&
        typeof (supabaseUser.user_metadata as any).name === 'string' &&
        ((supabaseUser.user_metadata as any).name as string).trim()) ||
      ''

    const name = requestedName || nameFromMetadata || supabaseUser.email.split('@')[0]

    // Prevent forged IDs/emails: derive identity from session only
    const existingById = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
    })

    if (existingById) {
      // Allow name update for the authenticated user (no role changes here)
      const updated = await prisma.user.update({
        where: { id: supabaseUser.id },
        data: { name },
      })
      return NextResponse.json({ success: true, data: updated }, { status: 200 })
    }

    // Legacy fallback: if a user exists by email, return it (do not attempt to "take over" IDs)
    const existingByEmail = await prisma.user.findUnique({
      where: { email: supabaseUser.email },
    })
    if (existingByEmail) {
      return NextResponse.json({ success: true, data: existingByEmail }, { status: 200 })
    }

    const created = await prisma.user.create({
      data: {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name,
        role: 'COACH',
        language: 'sv',
      },
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    logger.error('Error creating user', {}, error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({ where: { id: supabaseUser.id } })
    if (!dbUser || dbUser.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        language: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(
      { success: true, data: users },
      { status: 200 }
    )
  } catch (error) {
    logger.error('Error fetching users', {}, error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
