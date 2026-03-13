/**
 * POST /api/auto-optimize/evaluate
 *
 * Manually evaluate a program against an evaluation context.
 * Admin-only endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { parseAIProgram } from '@/lib/ai/program-parser'
import { evaluateProgram } from '@/lib/auto-optimize/program-evaluator'
import type { EvaluationContext } from '@/lib/auto-optimize/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })
    if (!profile || !['ADMIN', 'COACH'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { programText, context } = body as {
      programText: string
      context: EvaluationContext
    }

    if (!programText || !context) {
      return NextResponse.json(
        { error: 'Missing programText or context' },
        { status: 400 }
      )
    }

    // Parse the program
    const parseResult = parseAIProgram(programText)
    if (!parseResult.success || !parseResult.program) {
      return NextResponse.json({
        success: false,
        parseError: parseResult.error,
        evaluation: null,
      })
    }

    // Evaluate
    const evaluation = evaluateProgram(parseResult.program, context)

    return NextResponse.json({
      success: true,
      evaluation,
      parsedProgram: {
        name: parseResult.program.name,
        totalWeeks: parseResult.program.totalWeeks,
        phases: parseResult.program.phases.length,
      },
    })
  } catch (error) {
    console.error('Auto-optimize evaluate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
