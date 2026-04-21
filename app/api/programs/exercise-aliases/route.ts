/**
 * Program Importer — Alias management API
 *
 * GET    /api/programs/exercise-aliases          List the coach's learned
 *                                                aliases (with the target
 *                                                exercise joined).
 * DELETE /api/programs/exercise-aliases?id=...   Remove a single alias.
 *
 * Coach-only (and admin). Athletes can't prune aliases — the pool belongs
 * to their coach.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCoach } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api/utils'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const user = await requireCoach()
    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') ?? '').trim()

    const aliases = await prisma.exerciseNameAlias.findMany({
      where: {
        coachId: user.id,
        ...(search
          ? {
              OR: [
                { alias: { contains: search, mode: 'insensitive' } },
                { exercise: { name: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        alias: true,
        createdAt: true,
        exerciseId: true,
        exercise: {
          select: {
            id: true,
            name: true,
            category: true,
            biomechanicalPillar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    return NextResponse.json({ aliases })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireCoach()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    // Only the coach who owns the alias can delete it.
    const existing = await prisma.exerciseNameAlias.findFirst({
      where: { id, coachId: user.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.exerciseNameAlias.delete({ where: { id: existing.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
