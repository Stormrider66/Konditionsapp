import type { SportType } from '@prisma/client'
import { collectTeamData } from './data-collector'
import { preprocessData } from './preprocessor'
import { runPCA } from './pca-engine'
import { runPLS } from './pls-engine'
import { generatePLSInsight } from './pls-interpretation'
import { saveModel, savePLSModel } from './model-storage'
import { DEFAULT_PREPROCESSING_CONFIG } from './types'
import type { PCAModelResult, PLSModelResult } from './types'

interface AnalyzeTeamParams {
  teamId: string
  coachId: string
  sport: SportType
  selectedVariableIds?: string[]
  locale?: AppLocale
}

interface AnalyzeTeamResult {
  modelId: string
  result: PCAModelResult
}

interface AnalyzeTeamPLSParams {
  teamId: string
  coachId: string
  sport: SportType
  yVariableId: string
  selectedVariableIds?: string[]
  locale?: AppLocale
}

interface AnalyzeTeamPLSResult {
  modelId: string
  result: PLSModelResult
}

const MIN_ATHLETES = 8
type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

/**
 * High-level orchestration: collect → preprocess → PCA → diagnostics → store.
 * This is the main entry point for running team PCA analysis.
 */
export async function analyzeTeam({
  teamId,
  coachId,
  sport,
  selectedVariableIds,
  locale = 'en',
}: AnalyzeTeamParams): Promise<AnalyzeTeamResult> {
  // 1. Collect data for all team members
  const bundles = await collectTeamData(teamId)

  if (bundles.length < MIN_ATHLETES) {
    throw new Error(
      t(
        locale,
        `At least ${MIN_ATHLETES} players are required for multivariate analysis. The team has ${bundles.length} players.`,
        `Minst ${MIN_ATHLETES} spelare krävs för multivariat analys. Laget har ${bundles.length} spelare.`
      )
    )
  }

  // 2. Preprocess: filter, impute, center, scale
  const config = DEFAULT_PREPROCESSING_CONFIG
  const preprocessed = preprocessData(bundles, config, selectedVariableIds)

  if (preprocessed.athleteIds.length < MIN_ATHLETES) {
    throw new Error(
      t(
        locale,
        `After data filtering, ${preprocessed.athleteIds.length} players have enough data remaining. At least ${MIN_ATHLETES} are required.`,
        `Efter datafiltrering återstår ${preprocessed.athleteIds.length} spelare med tillräcklig data. Minst ${MIN_ATHLETES} krävs.`
      )
    )
  }

  if (preprocessed.variableIds.length < 3) {
    throw new Error(
      t(
        locale,
        `Only ${preprocessed.variableIds.length} variables have enough data coverage. At least 3 are required.`,
        `Bara ${preprocessed.variableIds.length} variabler har tillräcklig datatäckning. Minst 3 krävs.`
      )
    )
  }

  // 3. Run PCA
  const result = runPCA(preprocessed)

  // 4. Store model + scores
  const model = await saveModel({
    teamId,
    coachId,
    sport,
    result,
    config: config as unknown as import('@prisma/client').Prisma.InputJsonValue,
  })

  return {
    modelId: model.id,
    result,
  }
}

/**
 * High-level orchestration: collect → preprocess → PLS → AI insight → store.
 * Entry point for running team PLS regression analysis.
 */
export async function analyzeTeamPLS({
  teamId,
  coachId,
  sport,
  yVariableId,
  selectedVariableIds,
  locale = 'en',
}: AnalyzeTeamPLSParams): Promise<AnalyzeTeamPLSResult> {
  // 1. Collect data for all team members
  const bundles = await collectTeamData(teamId)

  if (bundles.length < MIN_ATHLETES) {
    throw new Error(
      t(
        locale,
        `At least ${MIN_ATHLETES} players are required for multivariate analysis. The team has ${bundles.length} players.`,
        `Minst ${MIN_ATHLETES} spelare krävs för multivariat analys. Laget har ${bundles.length} spelare.`
      )
    )
  }

  // 2. Ensure Y variable is included in selected variables
  let effectiveSelection = selectedVariableIds
  if (effectiveSelection && !effectiveSelection.includes(yVariableId)) {
    effectiveSelection = [...effectiveSelection, yVariableId]
  }

  // 3. Preprocess: filter, impute, center, scale
  const config = DEFAULT_PREPROCESSING_CONFIG
  const preprocessed = preprocessData(bundles, config, effectiveSelection)

  if (preprocessed.athleteIds.length < MIN_ATHLETES) {
    throw new Error(
      t(
        locale,
        `After data filtering, ${preprocessed.athleteIds.length} players have enough data remaining. At least ${MIN_ATHLETES} are required.`,
        `Efter datafiltrering återstår ${preprocessed.athleteIds.length} spelare med tillräcklig data. Minst ${MIN_ATHLETES} krävs.`
      )
    )
  }

  // Need at least 3 X vars + 1 Y var = 4 total
  if (preprocessed.variableIds.length < 4) {
    throw new Error(
      t(
        locale,
        `Only ${preprocessed.variableIds.length} variables have enough data coverage. At least 4 are required (3 X + 1 Y).`,
        `Bara ${preprocessed.variableIds.length} variabler har tillräcklig datatäckning. Minst 4 krävs (3 X + 1 Y).`
      )
    )
  }

  // 4. Run PLS
  const result = runPLS(preprocessed, yVariableId)

  // 5. Generate AI insight (non-blocking — failure is OK)
  const aiInsight = await generatePLSInsight(coachId, result, sport, locale)
  result.aiInsight = aiInsight

  // 6. Store model + scores
  const model = await savePLSModel({
    teamId,
    coachId,
    sport,
    result,
    config: config as unknown as import('@prisma/client').Prisma.InputJsonValue,
  })

  return {
    modelId: model.id,
    result,
  }
}
