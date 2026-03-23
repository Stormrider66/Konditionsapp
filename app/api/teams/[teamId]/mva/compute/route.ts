import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { analyzeTeam } from '@/lib/mva/team-analyzer'
import { MVA_VARIABLE_REGISTRY } from '@/lib/mva/variable-registry'
import type { SportType } from '@prisma/client'

export const maxDuration = 60

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params

    // Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Verify team ownership + get sport type
    const team = await prisma.team.findFirst({
      where: { id: teamId, userId: user.id },
      select: { id: true, sportType: true },
    })
    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    // Check coach subscription (PRO/ENTERPRISE)
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    })
    if (!subscription || !['PRO', 'ENTERPRISE'].includes(subscription.tier)) {
      return NextResponse.json(
        { success: false, error: 'PRO-prenumeration krävs för multivariat analys' },
        { status: 403 }
      )
    }

    const sport: SportType = team.sportType || 'GENERAL_FITNESS'

    // Parse optional selectedVariableIds from body
    let selectedVariableIds: string[] | undefined
    try {
      const body = await request.json()
      if (Array.isArray(body?.selectedVariableIds) && body.selectedVariableIds.length > 0) {
        selectedVariableIds = body.selectedVariableIds
      }
    } catch {
      // Empty body is fine — use all variables
    }

    const { modelId, result } = await analyzeTeam({
      teamId,
      coachId: user.id,
      sport,
      selectedVariableIds,
    })

    // Build variable categories map from registry
    const variableCategories: Record<string, string> = {}
    for (const vid of result.variableIds) {
      const reg = MVA_VARIABLE_REGISTRY.find((v) => v.id === vid)
      if (reg) variableCategories[vid] = reg.category
    }

    return NextResponse.json({
      success: true,
      data: {
        modelId,
        nComponents: result.nComponents,
        nObservations: result.athleteIds.length,
        nVariables: result.variableIds.length,
        explainedVariance: result.explainedVariance,
        cumulativeVariance: result.cumulativeVariance,
        scores: result.scores,
        loadings: result.loadings,
        eigenvalues: result.eigenvalues,
        variableIds: result.variableIds,
        variableNames: result.variableNames,
        athleteIds: result.athleteIds,
        athleteNames: result.athleteNames,
        diagnostics: result.diagnostics,
        t2Limit95: result.t2Limit95,
        t2Limit99: result.t2Limit99,
        dmodxLimit: result.dmodxLimit,
        excludedAthletes: result.preprocessedData.excludedAthletes,
        excludedVariables: result.preprocessedData.excludedVariables,
        imputedCells: result.preprocessedData.imputedCells,
        variableCategories,
      },
    })
  } catch (error) {
    console.error('MVA compute error:', error)
    const message = error instanceof Error ? error.message : 'Serverfel vid beräkning'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
