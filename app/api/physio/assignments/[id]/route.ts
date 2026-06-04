// app/api/physio/assignments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePhysioOrAdmin } from '@/lib/auth-utils'
import { z } from 'zod'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

const updateAssignmentSchema = z.object({
  role: z.enum(['PRIMARY', 'SECONDARY', 'CONSULTANT']).optional(),
  canModifyPrograms: z.boolean().optional(),
  canCreateRestrictions: z.boolean().optional(),
  canViewFullHistory: z.boolean().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/physio/assignments/[id]
 * Get a specific physio assignment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requirePhysioOrAdmin()
    locale = resolveRequestLocale(request, user.language)
    const { id } = await params

    const assignment = await prisma.physioAssignment.findUnique({
      where: { id },
      include: {
        physio: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: t(locale, 'Assignment not found', 'Tilldelningen hittades inte') }, { status: 404 })
    }

    // Check access
    if (user.role !== 'ADMIN' && assignment.physioUserId !== user.id) {
      return NextResponse.json({ error: t(locale, 'Access denied', 'Åtkomst nekad') }, { status: 403 })
    }

    return NextResponse.json(assignment)
  } catch (error) {
    console.error('Error fetching assignment:', error)
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: t(locale, 'Access denied', 'Åtkomst nekad') }, { status: 403 })
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to fetch assignment', 'Kunde inte hämta tilldelningen') },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/physio/assignments/[id]
 * Update a physio assignment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requirePhysioOrAdmin()
    locale = resolveRequestLocale(request, user.language)
    const { id } = await params
    const body = await request.json()
    const validatedData = updateAssignmentSchema.parse(body)

    // Check if assignment exists
    const existingAssignment = await prisma.physioAssignment.findUnique({
      where: { id },
    })

    if (!existingAssignment) {
      return NextResponse.json({ error: t(locale, 'Assignment not found', 'Tilldelningen hittades inte') }, { status: 404 })
    }

    // Only admin or the assigned physio can update
    if (user.role !== 'ADMIN' && existingAssignment.physioUserId !== user.id) {
      return NextResponse.json({ error: t(locale, 'Access denied', 'Åtkomst nekad') }, { status: 403 })
    }

    const assignment = await prisma.physioAssignment.update({
      where: { id },
      data: validatedData,
      include: {
        physio: {
          select: {
            id: true,
            name: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(assignment)
  } catch (error) {
    console.error('Error updating assignment:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t(locale, 'Validation error', 'Valideringsfel'), details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: t(locale, 'Access denied', 'Åtkomst nekad') }, { status: 403 })
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to update assignment', 'Kunde inte uppdatera tilldelningen') },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/physio/assignments/[id]
 * Delete a physio assignment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requirePhysioOrAdmin()
    locale = resolveRequestLocale(request, user.language)
    const { id } = await params

    // Check if assignment exists
    const existingAssignment = await prisma.physioAssignment.findUnique({
      where: { id },
    })

    if (!existingAssignment) {
      return NextResponse.json({ error: t(locale, 'Assignment not found', 'Tilldelningen hittades inte') }, { status: 404 })
    }

    // Only admin can delete assignments
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: t(locale, 'Only administrators can delete assignments', 'Endast administratörer kan ta bort tilldelningar') },
        { status: 403 }
      )
    }

    await prisma.physioAssignment.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting assignment:', error)
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: t(locale, 'Access denied', 'Åtkomst nekad') }, { status: 403 })
    }
    return NextResponse.json(
      { error: t(locale, 'Failed to delete assignment', 'Kunde inte ta bort tilldelningen') },
      { status: 500 }
    )
  }
}
