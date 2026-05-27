import {
  buildFootballPlanningContext,
  buildHockeyPlanningContext,
} from './planning-context'

type AppLocale = 'en' | 'sv'

export type TeamSportPlanningSummary = {
  sport: 'football' | 'hockey'
  title: string
  description: string
  assumptions: Array<{ label: string; value: string }>
  prevention: string[]
  loadGuidance: string[]
}

export function buildTeamSportPlanningSummary(input: {
  sport: string
  goal: string
  sessionsPerWeek?: number
  locale?: AppLocale
  hockeySettings?: Record<string, unknown> | null
  footballSettings?: Record<string, unknown> | null
}): TeamSportPlanningSummary | null {
  const locale = input.locale === 'sv' ? 'sv' : 'en'

  if (input.sport === 'TEAM_FOOTBALL' && input.footballSettings) {
    const planning = buildFootballPlanningContext({
      goal: input.goal,
      sessionsPerWeek: input.sessionsPerWeek,
      footballSettings: input.footballSettings,
      locale,
    })

    return {
      sport: 'football',
      title: t(locale, 'Planeringsantaganden för fotboll', 'Football planning assumptions'),
      description: t(
        locale,
        'Programmet byggs runt matchrytm, position, sprint-/löpmängd och skadeprevention.',
        'The program is built around match rhythm, position, sprint/running load, and injury prevention.'
      ),
      assumptions: [
        { label: t(locale, 'Position', 'Position'), value: footballPositionLabel(planning.position, locale) },
        { label: t(locale, 'Säsongsfas', 'Season phase'), value: phaseLabel(planning.phase, locale) },
        { label: t(locale, 'Matcher/vecka', 'Matches/week'), value: String(planning.matchesPerWeek) },
        { label: t(locale, 'Planerade pass/vecka', 'Planned sessions/week'), value: String(planning.sessionsPerWeek) },
        {
          label: t(locale, 'Intensitetsfaktor', 'Intensity factor'),
          value: `${Math.round(planning.loadGuidance.intensityMultiplier * 100)}%`,
        },
      ],
      prevention: planning.prevention.slice(0, 4).map((exercise) => exercise.name),
      loadGuidance: planning.loadGuidance.notes,
    }
  }

  if (input.sport === 'TEAM_ICE_HOCKEY' && input.hockeySettings) {
    const planning = buildHockeyPlanningContext({
      goal: input.goal,
      sessionsPerWeek: input.sessionsPerWeek,
      hockeySettings: input.hockeySettings,
      locale,
    })

    return {
      sport: 'hockey',
      title: t(locale, 'Planeringsantaganden för hockey', 'Hockey planning assumptions'),
      description: t(
        locale,
        'Programmet styrs av position, säsongsfas, matchbelastning och off-ice-tolerans.',
        'The program is guided by position, season phase, game load, and off-ice tolerance.'
      ),
      assumptions: [
        { label: t(locale, 'Position', 'Position'), value: hockeyPositionLabel(planning.position, locale) },
        { label: t(locale, 'Säsongsfas', 'Season phase'), value: phaseLabel(planning.phase, locale) },
        { label: t(locale, 'Matcher denna vecka', 'Games this week'), value: String(planning.matchesThisWeek) },
        { label: t(locale, 'Off-ice-pass', 'Off-ice sessions'), value: String(planning.requestedSessions) },
        {
          label: t(locale, 'Intensitetsfaktor', 'Intensity factor'),
          value: `${Math.round(planning.loadGuidance.intensityMultiplier * 100)}%`,
        },
      ],
      prevention: planning.prevention.slice(0, 4).map((exercise) => exercise.name),
      loadGuidance: planning.loadGuidance.notes,
    }
  }

  return null
}

function phaseLabel(phase: string, locale: AppLocale): string {
  const labels: Record<string, { sv: string; en: string }> = {
    off_season: { sv: 'Off-season', en: 'Off-season' },
    pre_season: { sv: 'Försäsong', en: 'Pre-season' },
    in_season: { sv: 'Tävlingssäsong', en: 'In-season' },
    playoffs: { sv: 'Slutspel', en: 'Playoffs' },
  }
  return labels[phase]?.[locale] ?? phase
}

function footballPositionLabel(position: string, locale: AppLocale): string {
  const labels: Record<string, { sv: string; en: string }> = {
    goalkeeper: { sv: 'Målvakt', en: 'Goalkeeper' },
    defender: { sv: 'Försvarare', en: 'Defender' },
    midfielder: { sv: 'Mittfältare', en: 'Midfielder' },
    forward: { sv: 'Forward', en: 'Forward' },
  }
  return labels[position]?.[locale] ?? position
}

function hockeyPositionLabel(position: string, locale: AppLocale): string {
  const labels: Record<string, { sv: string; en: string }> = {
    center: { sv: 'Center', en: 'Center' },
    wing: { sv: 'Ytterforward', en: 'Wing' },
    defense: { sv: 'Back', en: 'Defense' },
    goalie: { sv: 'Målvakt', en: 'Goalie' },
  }
  return labels[position]?.[locale] ?? position
}

function t(locale: AppLocale, svText: string, enText: string): string {
  return locale === 'sv' ? svText : enText
}
