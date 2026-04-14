/**
 * Dashboard Widget Resolver
 *
 * Resolves the effective set of dashboard widgets for a given user by walking
 * the precedence chain:
 *
 *   1. User's own DashboardPreference rows         (highest priority)
 *   2. Coach INDIVIDUAL template for this athlete
 *   3. Coach TEAM template (any team the athlete is in)
 *   4. Coach BUSINESS_DEFAULT template
 *   5. Hard-coded WIDGET_REGISTRY defaults         (lowest priority)
 *
 * Widgets marked `required: true` in the registry are always included
 * regardless of preferences (safety / billing critical).
 *
 * Returns an ordered list of resolved widgets with their visibility flag.
 * Hidden widgets are still returned (with `visible: false`) so the dashboard
 * page can skip both the data fetch and the render.
 */

import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import type { SportType } from '@prisma/client'
import {
  WIDGET_REGISTRY,
  getAthleteWidgets,
  getCoachWidgets,
  type WidgetDefinition,
} from './widget-registry'

export interface ResolvedWidget {
  key: string
  visible: boolean
  order: number
  /** Where the resolved value came from — useful for the settings UI badge. */
  source: 'user' | 'coach-individual' | 'coach-team' | 'coach-business' | 'system'
  definition: WidgetDefinition
}

interface WidgetEntry {
  widgetKey: string
  visible: boolean
  order: number
}

interface ResolveAthleteParams {
  userId: string
  clientId: string
  /** Optional — when missing (e.g. legacy /athlete/dashboard with no business),
   *  coach templates are skipped and only user prefs + registry defaults apply. */
  businessId?: string | null
  sport?: SportType | null
}

interface ResolveCoachParams {
  userId: string
  mode: 'PT' | 'TEAM' | 'GYM'
}

/**
 * Resolve the dashboard widget list for an athlete.
 * Cached per request via React `cache()`.
 */
export const resolveAthleteWidgets = cache(async function resolveAthleteWidgets(
  params: ResolveAthleteParams
): Promise<ResolvedWidget[]> {
  const { userId, clientId, businessId, sport } = params

  // Pull all the data we need in parallel.
  // When businessId is absent (legacy /athlete/dashboard fallback), skip
  // coach-template queries entirely.
  const [userPrefs, teamMemberships, allTemplates] = await Promise.all([
    prisma.dashboardPreference.findMany({
      where: { userId, role: 'ATHLETE' },
    }),
    businessId
      ? prisma.team.findMany({
          where: { members: { some: { id: clientId } } },
          select: { id: true },
        })
      : Promise.resolve([] as Array<{ id: string }>),
    businessId
      ? prisma.coachDashboardTemplate.findMany({
          where: {
            businessId,
            OR: [{ sport: null }, { sport: sport ?? undefined }],
            // Cover all three scopes in one query — filter in JS below.
          },
        })
      : Promise.resolve([] as never[]),
  ])

  // Partition templates by scope and pick the most relevant one per bucket.
  // For BUSINESS_DEFAULT: sport-specific beats sport-null.
  // For TEAM: must match a team this athlete belongs to.
  // For INDIVIDUAL: must match this athlete (clientId).
  const athleteTeamIds = new Set(teamMemberships.map(t => t.id))
  const pickBest = <T extends { sport: SportType | null }>(rows: T[]): T | null => {
    if (rows.length === 0) return null
    // Sport-specific (sport === active sport) beats sport-null.
    const sportSpecific = rows.find(r => r.sport === sport)
    return sportSpecific ?? rows[0]
  }

  const individualTemplate = pickBest(
    allTemplates.filter(t => t.scope === 'INDIVIDUAL' && t.targetId === clientId)
  )
  const teamTemplate = pickBest(
    allTemplates.filter(
      t => t.scope === 'TEAM' && t.targetId && athleteTeamIds.has(t.targetId)
    )
  )
  const businessTemplate = pickBest(
    allTemplates.filter(t => t.scope === 'BUSINESS_DEFAULT')
  )

  // Build per-key lookup map for user prefs.
  // Sport-specific prefs (sport === current sport) override sport-null prefs
  // so the dashboard adapts when the athlete switches sport.
  const userMap = new Map<string, (typeof userPrefs)[number]>()
  for (const p of userPrefs) {
    if (p.sport !== null && p.sport !== sport) continue
    const existing = userMap.get(p.widgetKey)
    // Prefer sport-specific over sport-null
    if (!existing || (p.sport !== null && existing.sport === null)) {
      userMap.set(p.widgetKey, p)
    }
  }

  const individualMap = mapTemplateWidgets(individualTemplate?.widgets)
  const teamMap = mapTemplateWidgets(teamTemplate?.widgets)
  const businessMap = mapTemplateWidgets(businessTemplate?.widgets)

  const audienceWidgets = getAthleteWidgets()

  // Filter widgets by sport relevance.
  // Required widgets ALWAYS pass — they're safety/billing critical and must
  // not be filtered out just because their sports list doesn't include the
  // athlete's current sport.
  const sportRelevant = audienceWidgets.filter(w => {
    if (w.required) return true
    if (!w.sports || w.sports.length === 0) return true
    if (!sport) return true // No active sport → don't filter
    return w.sports.includes(sport)
  })

  return sportRelevant.map<ResolvedWidget>(def => {
    const userPref = userMap.get(def.key)
    if (userPref !== undefined) {
      return {
        key: def.key,
        visible: def.required ? true : userPref.visible,
        order: userPref.order ?? def.defaultOrder,
        source: 'user',
        definition: def,
      }
    }

    const indiv = individualMap.get(def.key)
    if (indiv) {
      return {
        key: def.key,
        visible: def.required ? true : indiv.visible,
        order: indiv.order ?? def.defaultOrder,
        source: 'coach-individual',
        definition: def,
      }
    }

    const team = teamMap.get(def.key)
    if (team) {
      return {
        key: def.key,
        visible: def.required ? true : team.visible,
        order: team.order ?? def.defaultOrder,
        source: 'coach-team',
        definition: def,
      }
    }

    const biz = businessMap.get(def.key)
    if (biz) {
      return {
        key: def.key,
        visible: def.required ? true : biz.visible,
        order: biz.order ?? def.defaultOrder,
        source: 'coach-business',
        definition: def,
      }
    }

    return {
      key: def.key,
      visible: def.defaultVisible,
      order: def.defaultOrder,
      source: 'system',
      definition: def,
    }
  }).sort((a, b) => a.order - b.order)
})

/**
 * Resolve the dashboard widget list for a coach (their own dashboard).
 */
export const resolveCoachWidgets = cache(async function resolveCoachWidgets(
  params: ResolveCoachParams
): Promise<ResolvedWidget[]> {
  const { userId, mode } = params

  const userPrefs = await prisma.dashboardPreference.findMany({
    where: { userId, role: 'COACH', mode },
  })

  const userMap = new Map(userPrefs.map(p => [p.widgetKey, p]))
  const audienceWidgets = getCoachWidgets(mode)

  return audienceWidgets.map<ResolvedWidget>(def => {
    const userPref = userMap.get(def.key)
    if (userPref !== undefined) {
      return {
        key: def.key,
        visible: def.required ? true : userPref.visible,
        order: userPref.order ?? def.defaultOrder,
        source: 'user',
        definition: def,
      }
    }
    return {
      key: def.key,
      visible: def.defaultVisible,
      order: def.defaultOrder,
      source: 'system',
      definition: def,
    }
  }).sort((a, b) => a.order - b.order)
})

/**
 * Convenience: returns a Set of visible widget keys for quick checks in the
 * page render layer (e.g. {visibleSet.has('readiness-panel') && <Widget/>}).
 */
export function visibleKeys(widgets: ResolvedWidget[]): Set<string> {
  return new Set(widgets.filter(w => w.visible).map(w => w.key))
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function mapTemplateWidgets(widgets: unknown): Map<string, WidgetEntry> {
  if (!Array.isArray(widgets)) return new Map()
  const map = new Map<string, WidgetEntry>()
  for (const w of widgets) {
    if (!w || typeof w !== 'object') continue
    const entry = w as Partial<WidgetEntry>
    if (typeof entry.widgetKey !== 'string') continue
    if (!WIDGET_REGISTRY[entry.widgetKey]) continue // Skip unknown / deprecated keys
    map.set(entry.widgetKey, {
      widgetKey: entry.widgetKey,
      visible: entry.visible !== false, // default to visible if undefined
      order: typeof entry.order === 'number' ? entry.order : 0,
    })
  }
  return map
}
