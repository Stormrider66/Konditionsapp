/**
 * GET/POST /api/auto-optimize/variants
 *
 * List and create prompt variants.
 * Admin-only endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { listVariants, createVariant, promoteVariant, getActiveVariant } from '@/lib/auto-optimize/prompt-variants'
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
        '## UPPGIFT: SKAPA TR\u00c4NINGSPROGRAM',
        '',
        'Du ska skapa ett strukturerat tr\u00e4ningsprogram f\u00f6r en atlet.',
        '',
        'Sport: {{sport}}',
        'Metodik: {{methodology}}',
        'Programl\u00e4ngd: {{totalWeeks}} veckor',
        'Pass per vecka: {{sessionsPerWeek}}',
        'Erfarenhetsniv\u00e5: {{experienceLevel}}',
        '',
        '### ATLETENS M\u00c5L:',
        '{{goal}}',
        '',
        'VIKTIGA PRINCIPER:',
        '- F\u00f6lj vetenskapligt bepr\u00f6vade periodiseringsmetoder',
        '- Progressiv \u00f6verbelastning med l\u00e4mplig \u00e5terh\u00e4mtning',
        '- Anpassa efter atletens niv\u00e5 och m\u00e5l',
        '- Ge konkreta tr\u00e4ningspass med tydliga instruktioner',
        '- Inkludera uppv\u00e4rmning, huvudpass och nedvarvning',
        '- Var specifik med tider, distanser, intensiteter och zonh\u00e4nvisningar',
        '- Svara alltid p\u00e5 svenska',
        '',
        '### OUTPUT FORMAT',
        'Strukturera programmet som JSON med phases, weeklyTemplate, segments (warmup/work/cooldown).',
        'Var specifik med tider, distanser, intensiteter och zonh\u00e4nvisningar.',
      ].join('\n')

      const variant = await createVariant('full_program', template, { name: 'baseline-v1' })
      await promoteVariant(variant.id) // DEVELOPMENT -> TESTING
      const active = await promoteVariant(variant.id) // TESTING -> ACTIVE

      return NextResponse.json({ message: 'Baseline seeded and activated', variant: active })
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
