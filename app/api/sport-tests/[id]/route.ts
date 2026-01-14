// app/api/sport-tests/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/sport-tests/[id] - Get single sport test
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const sportTest = await prisma.sportTest.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            gender: true,
            birthDate: true,
            weight: true,
            height: true,
          },
        },
      },
    })

    if (!sportTest) {
      return NextResponse.json(
        { success: false, error: 'Sport test not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: sportTest,
    })
  } catch (error) {
    logger.error('Error fetching sport test', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sport test' },
      { status: 500 }
    )
  }
}

// PUT /api/sport-tests/[id] - Update sport test
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify test belongs to user
    const existingTest = await prisma.sportTest.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existingTest) {
      return NextResponse.json(
        { success: false, error: 'Sport test not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Only allow updating certain fields
    const allowedFields = [
      'testDate',
      'conditions',
      'rawData',
      'notes',
      'valid',
      'warnings',
      'benchmarkTier',
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (body.testDate) {
      updateData.testDate = new Date(body.testDate)
    }

    const sportTest = await prisma.sportTest.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: sportTest,
    })
  } catch (error) {
    logger.error('Error updating sport test', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to update sport test' },
      { status: 500 }
    )
  }
}

// DELETE /api/sport-tests/[id] - Delete sport test
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify test belongs to user
    const existingTest = await prisma.sportTest.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existingTest) {
      return NextResponse.json(
        { success: false, error: 'Sport test not found' },
        { status: 404 }
      )
    }

    await prisma.sportTest.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Sport test deleted',
    })
  } catch (error) {
    logger.error('Error deleting sport test', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete sport test' },
      { status: 500 }
    )
  }
}
