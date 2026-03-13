/**
 * GET/POST /api/auto-optimize/variants
 *
 * List and create prompt variants.
 * Admin-only endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { listVariants, createVariant } from '@/lib/auto-optimize/prompt-variants'
import type { PromptSlot } from '@/lib/auto-optimize/types'

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

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const slot = searchParams.get('slot') as PromptSlot | null
    const status = searchParams.get('status') as 'DEVELOPMENT' | 'TESTING' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED' | null

    const variants = await listVariants({
      ...(slot && { slot }),
      ...(status && { status }),
    })

    return NextResponse.json({ variants })
  } catch (error) {
    console.error('Auto-optimize variants list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { slot, template, name, parentId } = body as {
      slot: PromptSlot
      template: string
      name?: string
      parentId?: string
    }

    if (!slot || !template) {
      return NextResponse.json(
        { error: 'Missing slot or template' },
        { status: 400 }
      )
    }

    if (!['system', 'outline', 'phase', 'full_program'].includes(slot)) {
      return NextResponse.json(
        { error: 'Invalid slot. Must be: system, outline, phase, or full_program' },
        { status: 400 }
      )
    }

    const variant = await createVariant(slot, template, { name, parentId })

    return NextResponse.json({ variant }, { status: 201 })
  } catch (error) {
    console.error('Auto-optimize variant create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
