// app/api/clients/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from "@/lib/prisma"
import { clientSchema } from '@/lib/validations/schemas'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

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

    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id, userId: user.id },
      include: { team: true },
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

    const { id } = await params
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

    const data = validation.data

    // Convert birthDate string to Date
    const updateData = {
      name: data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      gender: data.gender,
      birthDate: new Date(data.birthDate),
      height: data.height,
      weight: data.weight,
      notes: data.notes || undefined,
      teamId: (data as any).teamId || null,
    }

    // Check ownership before updating
    const existingClient = await prisma.client.findUnique({
      where: { id },
    })

    if (!existingClient || existingClient.userId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Client not found or unauthorized',
        },
        { status: 404 }
      )
    }

    const client = await prisma.client.update({ where: { id }, data: updateData })

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

    const { id } = await params

    // Check ownership before deleting
    const existingClient = await prisma.client.findUnique({
      where: { id },
    })

    if (!existingClient || existingClient.userId !== user.id) {
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
