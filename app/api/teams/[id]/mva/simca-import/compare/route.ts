/**
 * Compare two imported SIMCA artifacts.
 *
 * Parsing/extraction lives in lib/mva/simca-parse (shared with the import
 * route). Imports created after the structured-summary change carry a
 * pre-parsed `summary` in modelData; older imports are parsed on the fly so
 * historic files still compare.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasProTierAccess } from '@/lib/subscription/require-feature-access'
import { getStoredOrParsedSummary } from '@/lib/mva/simca-parse'
import type { SimcaAthleteScore, SimcaSummary, SimcaImportWarning } from '@/lib/mva/simca-parse'

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

function distance(
  baseline: Pick<SimcaAthleteScore, 'pc1' | 'pc2'>,
  current: Pick<SimcaAthleteScore, 'pc1' | 'pc2'>
): number | null {
  if (baseline.pc1 === null || current.pc1 === null) return null
  const pc1Delta = current.pc1 - baseline.pc1
  const pc2Delta = baseline.pc2 !== null && current.pc2 !== null ? current.pc2 - baseline.pc2 : 0
  return Math.sqrt(pc1Delta ** 2 + pc2Delta ** 2)
}

interface ImportConfig {
  fileName?: string
  exportPreset?: string | null
  exportVersion?: string | null
}

/**
 * Warn when the two artifacts are unlikely to be directly comparable:
 * different export presets/versions, or barely-overlapping athlete sets.
 */
function compatibilityWarnings(
  baselineConfig: ImportConfig,
  currentConfig: ImportConfig,
  baselineSummary: SimcaSummary,
  currentSummary: SimcaSummary,
  matchedAthletes: number
): SimcaImportWarning[] {
  const warnings: SimcaImportWarning[] = []

  if (
    baselineConfig.exportPreset &&
    currentConfig.exportPreset &&
    baselineConfig.exportPreset !== currentConfig.exportPreset
  ) {
    warnings.push({
      code: 'preset_mismatch',
      severity: 'warning',
      messageEn: `The two files came from different export presets (${baselineConfig.exportPreset} vs ${currentConfig.exportPreset}). Variables may differ, so VIP changes can be misleading.`,
      messageSv: `Filerna kommer från olika exportförinställningar (${baselineConfig.exportPreset} vs ${currentConfig.exportPreset}). Variabler kan skilja sig, så VIP-förändringar kan vara missvisande.`,
    })
  }

  if (
    baselineConfig.exportVersion &&
    currentConfig.exportVersion &&
    baselineConfig.exportVersion !== currentConfig.exportVersion
  ) {
    warnings.push({
      code: 'version_mismatch',
      severity: 'info',
      messageEn: `The files use different export versions (${baselineConfig.exportVersion} vs ${currentConfig.exportVersion}). Column meaning may have shifted between versions.`,
      messageSv: `Filerna använder olika exportversioner (${baselineConfig.exportVersion} vs ${currentConfig.exportVersion}). Kolumnernas betydelse kan ha ändrats mellan versioner.`,
    })
  }

  const smaller = Math.min(baselineSummary.athletes.length, currentSummary.athletes.length)
  if (smaller > 0 && matchedAthletes / smaller < 0.5) {
    warnings.push({
      code: 'low_overlap',
      severity: 'warning',
      messageEn: `Only ${matchedAthletes} of ${smaller} players matched by name between the two files. Check naming consistency — most players could not be paired.`,
      messageSv: `Bara ${matchedAthletes} av ${smaller} spelare matchades på namn mellan filerna. Kontrollera namngivningen — de flesta spelare kunde inte paras ihop.`,
    })
  }

  return warnings
}

async function authorizeTeam(teamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId, userId: user.id },
    select: { id: true },
  })

  if (!team) {
    return { error: NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 }) }
  }

  // Platform admins bypass the PRO-tier gate
  if (!(await hasProTierAccess(user.id))) {
    const locale = await getUserLocale(user.id)
    return {
      error: NextResponse.json(
        { success: false, error: t(locale, 'A PRO subscription is required for SIMCA comparison', 'PRO-prenumeration krävs för SIMCA-jämförelse') },
        { status: 403 }
      ),
    }
  }

  return { user, team, locale: await getUserLocale(user.id) }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = 'en'

  try {
    const { id: teamId } = await params
    const auth = await authorizeTeam(teamId)
    if (auth.error) return auth.error
    locale = auth.locale

    const url = new URL(request.url)
    const baselineId = url.searchParams.get('baselineId')
    const currentId = url.searchParams.get('currentId')

    if (!baselineId || !currentId || baselineId === currentId) {
      return NextResponse.json(
        { success: false, error: t(auth.locale, 'Choose two different SIMCA imports to compare', 'Välj två olika SIMCA-importer att jämföra') },
        { status: 400 }
      )
    }

    const imports = await prisma.mVAModel.findMany({
      where: {
        id: { in: [baselineId, currentId] },
        teamId,
        modelType: 'SIMCA_IMPORT',
        status: 'IMPORTED',
      },
      select: {
        id: true,
        createdAt: true,
        config: true,
        modelData: true,
      },
    })

    const baseline = imports.find((item) => item.id === baselineId)
    const current = imports.find((item) => item.id === currentId)

    if (!baseline || !current) {
      return NextResponse.json({ success: false, error: t(auth.locale, 'SIMCA import not found', 'SIMCA-import hittades inte') }, { status: 404 })
    }

    const baselineSummary = getStoredOrParsedSummary(baseline.modelData)
    const currentSummary = getStoredOrParsedSummary(current.modelData)
    const baselineAthletes = new Map(baselineSummary.athletes.map((item) => [item.key, item]))
    const currentAthletes = new Map(currentSummary.athletes.map((item) => [item.key, item]))
    const baselineVip = new Map(baselineSummary.vipScores.map((item) => [item.key, item]))
    const currentVip = new Map(currentSummary.vipScores.map((item) => [item.key, item]))

    const athleteMovement = Array.from(currentAthletes.values())
      .map((currentAthlete) => {
        const baselineAthlete = baselineAthletes.get(currentAthlete.key)
        if (!baselineAthlete) return null
        const scoreDistance = distance(baselineAthlete, currentAthlete)
        return {
          athleteName: currentAthlete.name,
          baselinePc1: baselineAthlete.pc1,
          baselinePc2: baselineAthlete.pc2,
          currentPc1: currentAthlete.pc1,
          currentPc2: currentAthlete.pc2,
          pc1Delta: baselineAthlete.pc1 !== null && currentAthlete.pc1 !== null
            ? currentAthlete.pc1 - baselineAthlete.pc1
            : null,
          pc2Delta: baselineAthlete.pc2 !== null && currentAthlete.pc2 !== null
            ? currentAthlete.pc2 - baselineAthlete.pc2
            : null,
          distance: scoreDistance,
          baselineOutlier: baselineAthlete.isOutlier,
          currentOutlier: currentAthlete.isOutlier,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => (b.distance ?? -1) - (a.distance ?? -1))
      .slice(0, 10)

    const newOutliers = Array.from(currentAthletes.values())
      .filter((item) => item.isOutlier && !baselineAthletes.get(item.key)?.isOutlier)
      .map((item) => item.name)

    const resolvedOutliers = Array.from(baselineAthletes.values())
      .filter((item) => item.isOutlier && !currentAthletes.get(item.key)?.isOutlier)
      .map((item) => item.name)

    const vipChanges = Array.from(currentVip.values())
      .map((currentItem) => {
        const baselineItem = baselineVip.get(currentItem.key)
        if (!baselineItem) return null
        return {
          variableName: currentItem.variableName,
          baselineVip: baselineItem.vip,
          currentVip: currentItem.vip,
          vipDelta: currentItem.vip - baselineItem.vip,
          baselineCoefficient: baselineItem.coefficient,
          currentCoefficient: currentItem.coefficient,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => Math.abs(b.vipDelta) - Math.abs(a.vipDelta))
      .slice(0, 10)

    const newTopVip = Array.from(currentVip.values())
      .filter((item) => item.vip >= 1 && (baselineVip.get(item.key)?.vip ?? 0) < 1)
      .map((item) => item.variableName)

    const resolvedTopVip = Array.from(baselineVip.values())
      .filter((item) => item.vip >= 1 && (currentVip.get(item.key)?.vip ?? 0) < 1)
      .map((item) => item.variableName)

    const baselineConfig = (baseline.config ?? {}) as ImportConfig
    const currentConfig = (current.config ?? {}) as ImportConfig

    // Matched athletes overall (not just the top-10 movement slice).
    const matchedAthleteCount = Array.from(currentAthletes.keys()).filter((key) => baselineAthletes.has(key)).length

    const warnings = compatibilityWarnings(
      baselineConfig,
      currentConfig,
      baselineSummary,
      currentSummary,
      matchedAthleteCount
    )

    return NextResponse.json({
      success: true,
      data: {
        baseline: {
          id: baseline.id,
          fileName: baselineConfig.fileName ?? 'baseline',
          createdAt: baseline.createdAt.toISOString(),
          athletesDetected: baselineSummary.athletes.length,
          vipDetected: baselineSummary.vipScores.length,
        },
        current: {
          id: current.id,
          fileName: currentConfig.fileName ?? 'current',
          createdAt: current.createdAt.toISOString(),
          athletesDetected: currentSummary.athletes.length,
          vipDetected: currentSummary.vipScores.length,
        },
        summary: {
          matchedAthletes: matchedAthleteCount,
          matchedVipVariables: vipChanges.length,
          newOutlierCount: newOutliers.length,
          resolvedOutlierCount: resolvedOutliers.length,
          newTopVipCount: newTopVip.length,
          resolvedTopVipCount: resolvedTopVip.length,
        },
        warnings,
        athleteMovement,
        newOutliers,
        resolvedOutliers,
        vipChanges,
        newTopVip,
        resolvedTopVip,
      },
    })
  } catch (error) {
    console.error('SIMCA compare error:', error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Server error during SIMCA comparison', 'Serverfel vid SIMCA-jämförelse') },
      { status: 500 }
    )
  }
}
