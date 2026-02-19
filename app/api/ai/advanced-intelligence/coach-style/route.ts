// app/api/ai/advanced-intelligence/coach-style/route.ts
// Coach style extraction and matching API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { extractCoachingStyle, applyStyleToPrompt } from '@/lib/ai/advanced-intelligence'
import { logger } from '@/lib/logger'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireCoachFeatureAccess } from '@/lib/subscription/require-feature-access'
import { getCurrentUser, resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/ai/advanced-intelligence/coach-style
 * Extract coaching style from documents and program history
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Subscription gate (coach-level, no clientId needed)
    const denied = await requireCoachFeatureAccess(user.id, 'advanced_intelligence')
    if (denied) return denied

    const rateLimited = await rateLimitJsonResponse('ai:advanced:coach-style:get', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const { searchParams } = new URL(req.url)
    const requestedCoachId = searchParams.get('coachId')
    const includeHistory = searchParams.get('includeHistory') !== 'false'

    // Prevent information leaks: only allow extracting the requesting user's coach style
    // (Admins can query any coachId explicitly.)
    let coachId = user.id
    const resolved = await resolveAthleteClientId()
    if (resolved) {
      // User is an athlete or coach in athlete mode - get coach from client record
      const client = await prisma.client.findUnique({
        where: { id: resolved.clientId },
        select: { userId: true },
      })
      if (!client) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      coachId = client.userId
    } else if (user.role === 'ADMIN' && requestedCoachId) {
      coachId = requestedCoachId
    }

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
      {
        error: 'Internal server error',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
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
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Subscription gate (coach-level, no clientId needed)
    const deniedPost = await requireCoachFeatureAccess(user.id, 'advanced_intelligence')
    if (deniedPost) return deniedPost

    const rateLimited = await rateLimitJsonResponse('ai:advanced:coach-style:post', user.id, {
      limit: 10,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const body = await req.json()
    const { action, coachId, documentIds, prompt } = body

    // Prevent information leaks: only allow using the requesting user's coach style
    // (Admins can specify a coachId explicitly.)
    let effectiveCoachId = user.id
    const resolvedPost = await resolveAthleteClientId()
    if (resolvedPost) {
      // User is an athlete or coach in athlete mode - get coach from client record
      const client = await prisma.client.findUnique({
        where: { id: resolvedPost.clientId },
        select: { userId: true },
      })
      if (!client) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      effectiveCoachId = client.userId
    } else if (user.role === 'ADMIN' && coachId) {
      effectiveCoachId = coachId
    }

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
      {
        error: 'Internal server error',
        details:
          process.env.NODE_ENV === 'production'
            ? undefined
            : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
