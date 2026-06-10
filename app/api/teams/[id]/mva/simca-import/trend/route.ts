/**
 * Multi-import SIMCA trend.
 *
 * The compare route is strictly pairwise. This endpoint walks every stored
 * SIMCA import for the team in chronological order and builds per-athlete
 * PC1/PC2 trajectories and per-variable VIP trajectories, so a coach can see
 * a season-long trend rather than a single before/after.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { hasProTierAccess } from '@/lib/subscription/require-feature-access'
import { getStoredOrParsedSummary } from '@/lib/mva/simca-parse'

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

  if (!(await hasProTierAccess(user.id))) {
    const locale = await getUserLocale(user.id)
    return {
      error: NextResponse.json(
        { success: false, error: t(locale, 'A PRO subscription is required for SIMCA trends', 'PRO-prenumeration krävs för SIMCA-trender') },
        { status: 403 }
      ),
    }
  }

  return { user, team, locale: await getUserLocale(user.id) }
}

const MAX_IMPORTS = 12
const MAX_SERIES = 12

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

    const imports = await prisma.mVAModel.findMany({
      where: { teamId, modelType: 'SIMCA_IMPORT', status: 'IMPORTED' },
      orderBy: { createdAt: 'asc' },
      take: MAX_IMPORTS,
      select: { id: true, createdAt: true, config: true, modelData: true },
    })

    if (imports.length < 2) {
      return NextResponse.json({
        success: true,
        data: { imports: [], athletes: [], vip: [], insufficient: true },
      })
    }

    const timeline = imports.map((item) => {
      const config = (item.config ?? {}) as { fileName?: string }
      return {
        id: item.id,
        fileName: config.fileName ?? 'simca-result',
        createdAt: item.createdAt.toISOString(),
        summary: getStoredOrParsedSummary(item.modelData),
      }
    })

    // Per-athlete PC1/PC2/outlier trajectory, keyed by normalized name.
    const athleteSeries = new Map<string, {
      name: string
      points: { importId: string; pc1: number | null; pc2: number | null; isOutlier: boolean }[]
    }>()

    for (const snapshot of timeline) {
      for (const athlete of snapshot.summary.athletes) {
        let series = athleteSeries.get(athlete.key)
        if (!series) {
          series = { name: athlete.name, points: [] }
          athleteSeries.set(athlete.key, series)
        }
        series.points.push({
          importId: snapshot.id,
          pc1: athlete.pc1,
          pc2: athlete.pc2,
          isOutlier: athlete.isOutlier,
        })
      }
    }

    // Per-variable VIP trajectory.
    const vipSeries = new Map<string, {
      variableName: string
      points: { importId: string; vip: number }[]
    }>()

    for (const snapshot of timeline) {
      for (const vip of snapshot.summary.vipScores) {
        let series = vipSeries.get(vip.key)
        if (!series) {
          series = { variableName: vip.variableName, points: [] }
          vipSeries.set(vip.key, series)
        }
        series.points.push({ importId: snapshot.id, vip: vip.vip })
      }
    }

    // Keep only series spanning >= 2 imports; rank athletes by total PC movement
    // and variables by VIP spread so the most informative trends surface first.
    const athletes = Array.from(athleteSeries.values())
      .filter((s) => s.points.length >= 2)
      .map((s) => {
        const pcs = s.points.map((p) => p.pc1).filter((v): v is number => v !== null)
        const range = pcs.length >= 2 ? Math.max(...pcs) - Math.min(...pcs) : 0
        return { ...s, movement: range }
      })
      .sort((a, b) => b.movement - a.movement)
      .slice(0, MAX_SERIES)

    const vip = Array.from(vipSeries.values())
      .filter((s) => s.points.length >= 2)
      .map((s) => {
        const vips = s.points.map((p) => p.vip)
        const spread = Math.max(...vips) - Math.min(...vips)
        return { ...s, spread }
      })
      .sort((a, b) => b.spread - a.spread)
      .slice(0, MAX_SERIES)

    return NextResponse.json({
      success: true,
      data: {
        imports: timeline.map((s) => ({ id: s.id, fileName: s.fileName, createdAt: s.createdAt })),
        athletes,
        vip,
        insufficient: false,
      },
    })
  } catch (error) {
    console.error('SIMCA trend error:', error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Server error during SIMCA trend', 'Serverfel vid SIMCA-trend') },
      { status: 500 }
    )
  }
}
