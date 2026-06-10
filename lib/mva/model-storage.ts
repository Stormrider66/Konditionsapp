import { prisma } from '@/lib/prisma'
import type { PCAModelResult, PLSModelResult } from './types'
import type { SportType, Prisma } from '@prisma/client'
import { MVA_VARIABLE_REGISTRY } from './variable-registry'

type AppLocale = 'en' | 'sv'

function localizedVariableName(variableId: string, fallback: string, locale: AppLocale) {
  const variable = MVA_VARIABLE_REGISTRY.find((v) => v.id === variableId)
  if (!variable) return fallback
  return locale === 'sv' ? variable.nameSv : variable.name
}

interface SaveModelParams {
  teamId: string
  coachId: string
  sport: SportType
  result: PCAModelResult
  config: Prisma.InputJsonValue
}

/**
 * Serialize and persist a PCA model + athlete scores to the database.
 * Uses a transaction to ensure consistency.
 */
export async function saveModel({
  teamId,
  coachId,
  sport,
  result,
  config,
}: SaveModelParams) {
  const modelData = {
    loadings: result.loadings,
    eigenvalues: result.eigenvalues,
    means: result.preprocessedData.means,
    stds: result.preprocessedData.stds,
    variableIds: result.variableIds,
    variableNames: result.variableNames,
    t2Limit95: result.t2Limit95,
    t2Limit99: result.t2Limit99,
    dmodxLimit: result.dmodxLimit,
    dmodxLimit99: result.dmodxLimit99,
    warnings: result.warnings,
    imputedCells: result.preprocessedData.imputedCells,
  }

  return prisma.$transaction(async (tx) => {
    const model = await tx.mVAModel.create({
      data: {
        teamId,
        coachId,
        sport,
        modelType: 'PCA',
        config,
        xVariables: result.variableIds,
        nObservations: result.athleteIds.length,
        nXVariables: result.variableIds.length,
        nComponents: result.nComponents,
        explainedVarianceX: result.explainedVariance,
        modelData: modelData as unknown as Prisma.InputJsonValue,
        status: 'COMPLETED',
      },
    })

    // Create athlete scores
    await tx.mVAAthleteScore.createMany({
      data: result.diagnostics.map((d) => ({
        modelId: model.id,
        athleteId: d.clientId,
        scores: d.scores,
        hotellingT2: d.hotellingT2,
        dmodx: d.dmodx,
        isOutlierT2: d.isOutlierT2,
        isOutlierDModX: d.isOutlierDModX,
        topContributors: d.topContributors as unknown as Prisma.InputJsonValue,
      })),
    })

    return model
  })
}

interface SavePLSModelParams {
  teamId: string
  coachId: string
  sport: SportType
  result: PLSModelResult
  config: Prisma.InputJsonValue
}

/**
 * Serialize and persist a PLS model + athlete scores to the database.
 */
export async function savePLSModel({
  teamId,
  coachId,
  sport,
  result,
  config,
}: SavePLSModelParams) {
  const modelData = {
    xLoadings: result.xLoadings,
    xWeights: result.xWeights,
    coefficients: result.coefficients,
    vipScores: result.vipScores,
    yVariableId: result.yVariableId,
    yVariableName: result.yVariableName,
    r2Y: result.r2Y,
    q2: result.q2,
    r2X: result.r2X,
    yObserved: result.yObserved,
    yPredicted: result.yPredicted,
    aiInsight: result.aiInsight ?? null,
    warnings: result.warnings,
    means: result.preprocessedData.means,
    stds: result.preprocessedData.stds,
    xVariableIds: result.xVariableIds,
    xVariableNames: result.xVariableNames,
  }

  return prisma.$transaction(async (tx) => {
    const model = await tx.mVAModel.create({
      data: {
        teamId,
        coachId,
        sport,
        modelType: 'PLS',
        config,
        xVariables: result.xVariableIds,
        nObservations: result.athleteIds.length,
        nXVariables: result.xVariableIds.length,
        nComponents: result.nComponents,
        explainedVarianceX: [result.r2X],
        modelData: modelData as unknown as Prisma.InputJsonValue,
        status: 'COMPLETED',
      },
    })

    // Create athlete scores — store X scores
    await tx.mVAAthleteScore.createMany({
      data: result.athleteIds.map((athleteId, i) => ({
        modelId: model.id,
        athleteId,
        scores: result.xScores[i] ?? [],
        hotellingT2: 0,
        dmodx: 0,
        isOutlierT2: false,
        isOutlierDModX: false,
      })),
    })

    return model
  })
}

/**
 * Load the latest PCA model for a team and reconstruct it for display.
 */
export async function loadLatestModel(teamId: string, locale: AppLocale = 'en') {
  const model = await prisma.mVAModel.findFirst({
    where: { teamId, modelType: 'PCA', status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    include: { athleteScores: true },
  })

  if (!model) return null

  // Fetch athlete names separately (no relation on MVAAthleteScore → Client)
  const athleteIds = model.athleteScores.map((s) => s.athleteId)
  const athletes = await prisma.client.findMany({
    where: { id: { in: athleteIds } },
    select: { id: true, name: true },
  })
  const nameMap = new Map(athletes.map((a) => [a.id, a.name]))

  const modelData = model.modelData as unknown as {
    loadings: number[][]
    eigenvalues: number[]
    means: number[]
    stds: number[]
    variableIds: string[]
    variableNames: string[]
    t2Limit95: number
    t2Limit99: number
    dmodxLimit: number
    dmodxLimit99?: number
    warnings?: import('./types').MVAWarning[]
    imputedCells?: number
  }

  // Build variableId → category map from registry
  const variableCategories: Record<string, string> = {}
  for (const vid of modelData.variableIds) {
    const reg = MVA_VARIABLE_REGISTRY.find((v) => v.id === vid)
    if (reg) variableCategories[vid] = reg.category
  }

  return {
    id: model.id,
    createdAt: model.createdAt,
    sport: model.sport,
    nComponents: model.nComponents,
    explainedVariance: model.explainedVarianceX,
    cumulativeVariance: model.explainedVarianceX.reduce<number[]>((acc, v) => {
      acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + v)
      return acc
    }, []),
    loadings: modelData.loadings,
    eigenvalues: modelData.eigenvalues,
    variableIds: modelData.variableIds,
    variableNames: modelData.variableIds.map((variableId, index) =>
      localizedVariableName(variableId, modelData.variableNames[index] ?? variableId, locale)
    ),
    variableCategories,
    t2Limit95: modelData.t2Limit95,
    t2Limit99: modelData.t2Limit99,
    dmodxLimit: modelData.dmodxLimit,
    dmodxLimit99: modelData.dmodxLimit99 ?? modelData.dmodxLimit,
    warnings: modelData.warnings ?? [],
    config: model.config,
    nObservations: model.nObservations,
    nXVariables: model.nXVariables,
    athleteScores: model.athleteScores.map((s) => ({
      clientId: s.athleteId,
      clientName: nameMap.get(s.athleteId) ?? (locale === 'sv' ? 'Okänd' : 'Unknown'),
      scores: s.scores,
      hotellingT2: s.hotellingT2,
      dmodx: s.dmodx,
      isOutlierT2: s.isOutlierT2,
      isOutlierDModX: s.isOutlierDModX,
      topContributors: (s.topContributors as { variableId: string; variableName: string; contribution: number; direction: string }[] | null)
        ?.map((contributor) => ({
          ...contributor,
          variableName: localizedVariableName(contributor.variableId, contributor.variableName, locale),
        })) ?? null,
    })),
  }
}

/**
 * Load the latest PLS model for a team and reconstruct it for display.
 */
export async function loadLatestPLSModel(teamId: string, locale: AppLocale = 'en') {
  const model = await prisma.mVAModel.findFirst({
    where: { teamId, modelType: 'PLS', status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    include: { athleteScores: true },
  })

  if (!model) return null

  // Fetch athlete names separately
  const athleteIds = model.athleteScores.map((s) => s.athleteId)
  const athletes = await prisma.client.findMany({
    where: { id: { in: athleteIds } },
    select: { id: true, name: true },
  })
  const nameMap = new Map(athletes.map((a) => [a.id, a.name]))

  const modelData = model.modelData as unknown as {
    xLoadings: number[][]
    xWeights: number[][]
    coefficients: number[][]
    vipScores: { variableId: string; variableName: string; vip: number; coefficient: number; category: string }[]
    yVariableId: string
    yVariableName: string
    r2Y: number
    q2: number
    r2X: number
    yObserved: number[]
    yPredicted: number[]
    aiInsight: { summary: string; keyDrivers: string[]; recommendations: string[] } | null
    warnings?: import('./types').MVAWarning[]
    means: number[]
    stds: number[]
    xVariableIds: string[]
    xVariableNames: string[]
  }

  // Build variableId → category map from registry
  const variableCategories: Record<string, string> = {}
  for (const vid of modelData.xVariableIds) {
    const reg = MVA_VARIABLE_REGISTRY.find((v) => v.id === vid)
    if (reg) variableCategories[vid] = reg.category
  }

  return {
    id: model.id,
    createdAt: model.createdAt,
    sport: model.sport,
    nComponents: model.nComponents,
    nObservations: model.nObservations,
    nXVariables: model.nXVariables,
    r2Y: modelData.r2Y,
    q2: modelData.q2,
    r2X: modelData.r2X,
    vipScores: modelData.vipScores.map((score) => ({
      ...score,
      variableName: localizedVariableName(score.variableId, score.variableName, locale),
    })),
    yVariableId: modelData.yVariableId,
    yVariableName: localizedVariableName(modelData.yVariableId, modelData.yVariableName, locale),
    yObserved: modelData.yObserved,
    yPredicted: modelData.yPredicted,
    aiInsight: modelData.aiInsight,
    warnings: modelData.warnings ?? [],
    xVariableIds: modelData.xVariableIds,
    xVariableNames: modelData.xVariableIds.map((variableId, index) =>
      localizedVariableName(variableId, modelData.xVariableNames[index] ?? variableId, locale)
    ),
    variableCategories,
    config: model.config,
    athleteNames: model.athleteScores.map((s) => nameMap.get(s.athleteId) ?? (locale === 'sv' ? 'Okänd' : 'Unknown')),
  }
}
