/**
 * Coach External Calendar Connection Management API
 *
 * GET /api/coach/calendar/external/[id] - Get a specific connection
 * PUT /api/coach/calendar/external/[id] - Update connection settings
 * DELETE /api/coach/calendar/external/[id] - Delete a connection
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { z } from 'zod'
import { logError } from '@/lib/logger-console'

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateConnectionSchema = z.object({
  calendarName: z.string().min(1).max(100).optional(),
  syncEnabled: z.boolean().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
})

/**
 * GET /api/coach/calendar/external/[id]
 * Get a specific calendar connection
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach()
    const { id } = await params

    const connection = await prisma.externalCalendarConnection.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        provider: true,
        calendarName: true,
        syncEnabled: true,
        lastSyncAt: true,
        lastSyncError: true,
        color: true,
        createdAt: true,
      },
    })

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    return NextResponse.json({ connection })
  } catch (error) {
    logError('Error fetching coach calendar connection:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connection' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/coach/calendar/external/[id]
 * Update connection settings
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach()
    const { id } = await params

    // Verify ownership
    const existing = await prisma.externalCalendarConnection.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    const body = await request.json()
    const validationResult = updateConnectionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const data = validationResult.data

    const connection = await prisma.externalCalendarConnection.update({
      where: { id },
      data: {
        calendarName: data.calendarName,
        syncEnabled: data.syncEnabled,
        color: data.color,
      },
      select: {
        id: true,
        provider: true,
        calendarName: true,
        syncEnabled: true,
        lastSyncAt: true,
        lastSyncError: true,
        color: true,
      },
    })

    return NextResponse.json({ connection })
  } catch (error) {
    logError('Error updating coach calendar connection:', error)
    return NextResponse.json(
      { error: 'Failed to update connection' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/coach/calendar/external/[id]
 * Delete a calendar connection
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireCoach()
    const { id } = await params

    // Verify ownership
    const existing = await prisma.externalCalendarConnection.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    await prisma.externalCalendarConnection.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logError('Error deleting coach calendar connection:', error)
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    )
  }
}
