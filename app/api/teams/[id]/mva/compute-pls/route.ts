import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasProTierAccess } from '@/lib/subscription/require-feature-access'
import { analyzeTeamPLS } from '@/lib/mva/team-analyzer'
import { MVA_VARIABLE_REGISTRY } from '@/lib/mva/variable-registry'
import type { SportType } from '@prisma/client'

export const maxDuration = 60

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

async function getUserLocale(userId: string): Promise<AppLocale> {
  const appUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { language: true },
  })
  return appUser?.language === 'sv' ? 'sv' : 'en'
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = 'en'

  try {
    const { id: teamId } = await params

    // Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    locale = await getUserLocale(user.id)

    // Verify team ownership + get sport type
    const team = await prisma.team.findFirst({
      where: { id: teamId, userId: user.id },
      select: { id: true, sportType: true },
    })
    if (!team) {
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    // Check coach subscription (PRO/ENTERPRISE) — platform admins bypass
    if (!(await hasProTierAccess(user.id))) {
      return NextResponse.json(
        { success: false, error: t(locale, 'A PRO subscription is required for multivariate analysis', 'PRO-prenumeration krävs för multivariat analys') },
        { status: 403 }
      )
    }

    const sport: SportType = team.sportType || 'GENERAL_FITNESS'

    // Parse body
    let yVariableId: string | undefined
    let selectedVariableIds: string[] | undefined
    try {
      const body = await request.json()
      yVariableId = body?.yVariableId
      if (Array.isArray(body?.selectedVariableIds) && body.selectedVariableIds.length > 0) {
        selectedVariableIds = body.selectedVariableIds
      }
    } catch {
      // Invalid JSON
    }

    if (!yVariableId || typeof yVariableId !== 'string') {
      return NextResponse.json(
        { success: false, error: t(locale, 'yVariableId is required', 'yVariableId krävs') },
        { status: 400 }
      )
    }

    const { modelId, result } = await analyzeTeamPLS({
      teamId,
      coachId: user.id,
      sport,
      yVariableId,
      selectedVariableIds,
      locale,
    })

    // Build variable categories map from registry
    const variableCategories: Record<string, string> = {}
    for (const vid of result.xVariableIds) {
      const reg = MVA_VARIABLE_REGISTRY.find((v) => v.id === vid)
      if (reg) variableCategories[vid] = reg.category
    }

    return NextResponse.json({
      success: true,
      data: {
        modelId,
        nComponents: result.nComponents,
        nObservations: result.athleteIds.length,
        nXVariables: result.xVariableIds.length,
        r2Y: result.r2Y,
        q2: result.q2,
        r2X: result.r2X,
        vipScores: result.vipScores,
        yVariableId: result.yVariableId,
        yVariableName: result.yVariableName,
        yObserved: result.yObserved,
        yPredicted: result.yPredicted,
        xVariableIds: result.xVariableIds,
        xVariableNames: result.xVariableNames,
        athleteIds: result.athleteIds,
        athleteNames: result.athleteNames,
        aiInsight: result.aiInsight ?? null,
        excludedAthletes: result.preprocessedData.excludedAthletes,
        excludedVariables: result.preprocessedData.excludedVariables,
        imputedCells: result.preprocessedData.imputedCells,
        variableCategories,
      },
    })
  } catch (error) {
    console.error('MVA PLS compute error:', error)
    const message = error instanceof Error ? error.message : t(locale, 'Server error during calculation', 'Serverfel vid beräkning')
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
