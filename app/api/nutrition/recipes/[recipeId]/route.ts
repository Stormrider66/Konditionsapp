import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

// DELETE /api/nutrition/recipes/[recipeId] - Remove one saved recipe template.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await prisma.nutritionRecipe.findFirst({
      where: { id: recipeId, clientId: resolved.clientId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Recipe not found' }, { status: 404 })
    }

    await prisma.nutritionRecipe.delete({ where: { id: recipeId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting nutrition recipe', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete recipe' },
      { status: 500 }
    )
  }
}
