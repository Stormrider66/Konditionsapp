/**
 * GET/POST /api/auto-optimize/variants
 *
 * List and create prompt variants.
 * Admin-only endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { listVariants, createVariant, promoteVariant, deprecateVariant, getActiveVariant } from '@/lib/auto-optimize/prompt-variants'
import { ENRICHED_BASELINE_TEMPLATE } from '@/lib/auto-optimize/enriched-baseline-template'
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
    const action = searchParams.get('action')

    // Seed: creates baseline variant and promotes to ACTIVE
    if (action === 'seed') {
      const existing = await getActiveVariant('full_program')
      if (existing) {
        return NextResponse.json({ message: 'Baseline already exists', variant: existing })
      }

      const template = [
        '## TASK: CREATE TRAINING PROGRAM',
        '',
        'Create a structured training program for an athlete.',
        '',
        'Sport: {{sport}}',
        'Methodology: {{methodology}}',
        'Program length: {{totalWeeks}} weeks',
        'Sessions per week: {{sessionsPerWeek}}',
        'Experience level: {{experienceLevel}}',
        '',
        '### ATHLETE GOAL:',
        '{{goal}}',
        '',
        'IMPORTANT PRINCIPLES:',
        '- Follow evidence-based periodization methods',
        '- Use progressive overload with appropriate recovery',
        '- Adapt to the athlete level and goal',
        '- Provide concrete training sessions with clear instructions',
        '- Include warm-up, main work, and cooldown',
        '- Be specific with times, distances, intensities, and zone references',
        '- Always answer in English',
        '',
        '### OUTPUT FORMAT',
        'Structure the program as JSON with phases, weeklyTemplate, and segments (warmup/work/cooldown).',
        'Be specific with times, distances, intensities, and zone references.',
      ].join('\n')

      const variant = await createVariant('full_program', template, { name: 'baseline-v1' })
      await promoteVariant(variant.id) // DEVELOPMENT -> TESTING
      const active = await promoteVariant(variant.id) // TESTING -> ACTIVE

      return NextResponse.json({ message: 'Baseline seeded and activated', variant: active })
    }

    // Seed enriched: creates enriched variant with conditional blocks
    if (action === 'seed-enriched') {
      // Deprecate current active if exists
      const existing = await getActiveVariant('full_program')
      if (existing) {
        await deprecateVariant(existing.id)
      }

      const variant = await createVariant('full_program', ENRICHED_BASELINE_TEMPLATE, {
        name: 'enriched-v1',
        parentId: existing?.id,
      })
      await promoteVariant(variant.id) // DEVELOPMENT -> TESTING
      const active = await promoteVariant(variant.id) // TESTING -> ACTIVE

      return NextResponse.json({
        message: 'Enriched baseline seeded and activated',
        variant: active,
        previousVariant: existing?.id || null,
      })
    }

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
