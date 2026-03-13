/**
 * GET/PUT /api/auto-optimize/variants/[id]
 *
 * Get variant detail or promote variant.
 * Admin-only endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getVariant, promoteVariant, deprecateVariant } from '@/lib/auto-optimize/prompt-variants'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  })
  if (!profile || !['ADMIN', 'COACH'].includes(profile.role)) return null

  return user
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const variant = await getVariant(id)
    if (!variant) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    }

    return NextResponse.json({ variant })
  } catch (error) {
    console.error('Auto-optimize variant detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action } = body as { action: 'promote' | 'deprecate' }

    if (!action || !['promote', 'deprecate'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: promote or deprecate' },
        { status: 400 }
      )
    }

    const variant = action === 'promote'
      ? await promoteVariant(id)
      : await deprecateVariant(id)

    return NextResponse.json({ variant })
  } catch (error) {
    console.error('Auto-optimize variant update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
