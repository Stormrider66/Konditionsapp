// app/api/ai/advanced-intelligence/coach-style/route.ts
// Coach style extraction and matching API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractCoachingStyle, applyStyleToPrompt } from '@/lib/ai/advanced-intelligence'
import { logger } from '@/lib/logger'

/**
 * GET /api/ai/advanced-intelligence/coach-style
 * Extract coaching style from documents and program history
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const coachId = searchParams.get('coachId') || user.id
    const includeHistory = searchParams.get('includeHistory') !== 'false'

    const style = await extractCoachingStyle({
      coachId,
      includeHistory,
    })

    return NextResponse.json({
      success: true,
      coachId,
      style,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Error extracting coaching style', {}, error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ai/advanced-intelligence/coach-style
 * Extract style from specific documents or apply to prompt
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, coachId, documentIds, prompt } = body

    const effectiveCoachId = coachId || user.id

    if (action === 'extract') {
      // Extract style from specific documents
      const style = await extractCoachingStyle({
        coachId: effectiveCoachId,
        documentIds,
        includeHistory: true,
      })

      return NextResponse.json({
        success: true,
        action: 'extract',
        coachId: effectiveCoachId,
        style,
        generatedAt: new Date().toISOString(),
      })
    }

    if (action === 'apply' && prompt) {
      // Apply style to a prompt
      const style = await extractCoachingStyle({
        coachId: effectiveCoachId,
        documentIds,
        includeHistory: true,
      })

      const styledPrompt = applyStyleToPrompt(style, prompt)

      return NextResponse.json({
        success: true,
        action: 'apply',
        coachId: effectiveCoachId,
        originalPrompt: prompt,
        styledPrompt,
        styleApplied: style.styleProfile,
        generatedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json(
      { error: 'Ogiltig action. Använd "extract" eller "apply".' },
      { status: 400 }
    )
  } catch (error) {
    logger.error('Error processing coach style request', {}, error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
